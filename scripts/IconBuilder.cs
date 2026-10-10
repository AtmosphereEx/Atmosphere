using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

namespace AtmosphereIconGenerator
{
    class Program
    {
        static void Main()
        {
            Directory.CreateDirectory("assets");
            Directory.CreateDirectory("dist");
            Directory.CreateDirectory(@"src\renderer\public");

            string desktopDist = @"C:\Users\user\Desktop\AtmosphereEx";
            if (Directory.Exists(desktopDist))
            {
                Directory.CreateDirectory(Path.Combine(desktopDist, "assets"));
                Directory.CreateDirectory(Path.Combine(desktopDist, "dist"));
            }

            int[] sizes = new int[] { 256, 128, 64, 48, 32, 16 };
            MemoryStream[] pngStreams = new MemoryStream[sizes.Length];

            for (int i = 0; i < sizes.Length; i++)
            {
                int s = sizes[i];
                using (Bitmap bmp = GenerateAtmosphereIcon(s))
                {
                    if (s == 256)
                    {
                        bmp.Save(@"assets\icon.png", ImageFormat.Png);
                        bmp.Save(@"dist\icon.png", ImageFormat.Png);
                        bmp.Save(@"src\renderer\public\icon.png", ImageFormat.Png);

                        if (Directory.Exists(desktopDist))
                        {
                            bmp.Save(Path.Combine(desktopDist, @"assets\icon.png"), ImageFormat.Png);
                            bmp.Save(Path.Combine(desktopDist, @"dist\icon.png"), ImageFormat.Png);
                        }
                    }
                    pngStreams[i] = new MemoryStream();
                    bmp.Save(pngStreams[i], ImageFormat.Png);
                }
            }

            // Generate multi-resolution .ico
            byte[] icoBytes;
            using (MemoryStream ms = new MemoryStream())
            using (BinaryWriter bw = new BinaryWriter(ms))
            {
                // ICONDIR
                bw.Write((ushort)0); // Reserved
                bw.Write((ushort)1); // Type: 1 = Icon
                bw.Write((ushort)sizes.Length); // Image count

                int offset = 6 + (sizes.Length * 16);

                for (int i = 0; i < sizes.Length; i++)
                {
                    int s = sizes[i];
                    uint dataLen = (uint)pngStreams[i].Length;

                    // ICONDIRENTRY
                    bw.Write((byte)(s >= 256 ? 0 : s)); // Width
                    bw.Write((byte)(s >= 256 ? 0 : s)); // Height
                    bw.Write((byte)0); // Colors
                    bw.Write((byte)0); // Reserved
                    bw.Write((ushort)1); // Color planes
                    bw.Write((ushort)32); // Bits per pixel
                    bw.Write((uint)dataLen);
                    bw.Write((uint)offset);

                    offset += (int)dataLen;
                }

                for (int i = 0; i < sizes.Length; i++)
                {
                    byte[] bytes = pngStreams[i].ToArray();
                    bw.Write(bytes);
                    pngStreams[i].Dispose();
                }

                bw.Flush();
                icoBytes = ms.ToArray();
            }

            File.WriteAllBytes(@"assets\icon.ico", icoBytes);
            File.WriteAllBytes(@"dist\favicon.ico", icoBytes);
            File.WriteAllBytes(@"src\renderer\public\favicon.ico", icoBytes);

            if (Directory.Exists(desktopDist))
            {
                File.WriteAllBytes(Path.Combine(desktopDist, @"assets\icon.ico"), icoBytes);
                File.WriteAllBytes(Path.Combine(desktopDist, @"dist\favicon.ico"), icoBytes);
            }

            Console.WriteLine("Atmosphere icon generation completed successfully!");
        }

        static Bitmap GenerateAtmosphereIcon(int size)
        {
            Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                float s = size / 256f;

                // 1. App Icon Squircle Frame
                float pad = 12f * s;
                float rectW = size - (2f * pad);
                float radius = 50f * s;

                using (GraphicsPath bgPath = new GraphicsPath())
                {
                    bgPath.AddArc(pad, pad, radius * 2, radius * 2, 180, 90);
                    bgPath.AddArc(pad + rectW - (radius * 2), pad, radius * 2, radius * 2, 270, 90);
                    bgPath.AddArc(pad + rectW - (radius * 2), pad + rectW - (radius * 2), radius * 2, radius * 2, 0, 90);
                    bgPath.AddArc(pad, pad + rectW - (radius * 2), radius * 2, radius * 2, 90, 90);
                    bgPath.CloseFigure();

                    // Dark space gradient
                    using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                        new PointF(0, 0),
                        new PointF(size, size),
                        Color.FromArgb(255, 12, 18, 28),
                        Color.FromArgb(255, 3, 6, 12)))
                    {
                        g.FillPath(bgBrush, bgPath);
                    }

                    // Inner deep cyan ambient light
                    using (PathGradientBrush innerGlow = new PathGradientBrush(bgPath))
                    {
                        innerGlow.CenterColor = Color.FromArgb(45, 14, 165, 233);
                        innerGlow.SurroundColors = new Color[] { Color.FromArgb(0, 3, 6, 12) };
                        g.FillPath(innerGlow, bgPath);
                    }

                    // Sleek border
                    using (LinearGradientBrush borderBrush = new LinearGradientBrush(
                        new PointF(0, 0),
                        new PointF(size, size),
                        Color.FromArgb(210, 56, 189, 248),
                        Color.FromArgb(70, 14, 165, 233)))
                    using (Pen borderPen = new Pen(borderBrush, 5.5f * s))
                    {
                        g.DrawPath(borderPen, bgPath);
                    }

                    // Clip to squircle for clean edges
                    g.SetClip(bgPath);
                }

                // 2. Atmosphere Planet & Orbital Rings Composition
                float cx = 128f * s;
                float cy = 128f * s;

                // Ambient background diffuse aura
                using (GraphicsPath auraPath = new GraphicsPath())
                {
                    auraPath.AddEllipse(cx - 72f * s, cy - 72f * s, 144f * s, 144f * s);
                    using (PathGradientBrush auraBrush = new PathGradientBrush(auraPath))
                    {
                        auraBrush.CenterColor = Color.FromArgb(75, 56, 189, 248);
                        auraBrush.SurroundColors = new Color[] { Color.FromArgb(0, 56, 189, 248) };
                        g.FillPath(auraBrush, auraPath);
                    }
                }

                // Outer Orbital Ring (Back half)
                GraphicsState state1 = g.Save();
                g.TranslateTransform(cx, cy);
                g.RotateTransform(-28f);

                float rx = 92f * s;
                float ry = 32f * s;

                using (LinearGradientBrush backRingBrush = new LinearGradientBrush(
                    new PointF(-rx, 0), new PointF(rx, 0),
                    Color.FromArgb(60, 56, 189, 248),
                    Color.FromArgb(140, 14, 165, 233)))
                using (Pen backRingPen = new Pen(backRingBrush, 4f * s))
                {
                    g.DrawArc(backRingPen, -rx, -ry, rx * 2, ry * 2, 175, 190);
                }

                g.Restore(state1);

                // Planet Body (Atmospheric Sphere)
                float planetR = 48f * s;
                using (GraphicsPath planetPath = new GraphicsPath())
                {
                    planetPath.AddEllipse(cx - planetR, cy - planetR, planetR * 2, planetR * 2);

                    // Planet sphere gradient with light source at top-left
                    using (LinearGradientBrush planetBrush = new LinearGradientBrush(
                        new PointF(cx - planetR, cy - planetR),
                        new PointF(cx + planetR, cy + planetR),
                        Color.FromArgb(255, 30, 58, 92),
                        Color.FromArgb(255, 8, 14, 24)))
                    {
                        g.FillPath(planetBrush, planetPath);
                    }

                    // Inner sphere shadow (depth)
                    using (PathGradientBrush sphereDepth = new PathGradientBrush(planetPath))
                    {
                        sphereDepth.CenterPoint = new PointF(cx - 14f * s, cy - 14f * s);
                        sphereDepth.CenterColor = Color.FromArgb(255, 56, 189, 248);
                        sphereDepth.SurroundColors = new Color[] { Color.FromArgb(255, 5, 10, 18) };
                        g.FillPath(sphereDepth, planetPath);
                    }
                }

                // Atmospheric Limb / Stratosphere Glowing Crescent Arc
                using (GraphicsPath crescentPath = new GraphicsPath())
                {
                    crescentPath.AddArc(cx - planetR, cy - planetR, planetR * 2, planetR * 2, 130, 160);
                    using (Pen glowRimPen = new Pen(Color.FromArgb(120, 125, 211, 252), 10f * s))
                    {
                        glowRimPen.StartCap = LineCap.Round;
                        glowRimPen.EndCap = LineCap.Round;
                        g.DrawPath(glowRimPen, crescentPath);
                    }
                    using (Pen sharpRimPen = new Pen(Color.FromArgb(255, 224, 242, 254), 4.5f * s))
                    {
                        sharpRimPen.StartCap = LineCap.Round;
                        sharpRimPen.EndCap = LineCap.Round;
                        g.DrawPath(sharpRimPen, crescentPath);
                    }
                }

                // Front Orbital Ring (Passing in front of planet)
                GraphicsState state2 = g.Save();
                g.TranslateTransform(cx, cy);
                g.RotateTransform(-28f);

                // Front glow behind ring
                using (Pen frontRingGlow = new Pen(Color.FromArgb(80, 56, 189, 248), 12f * s))
                {
                    frontRingGlow.StartCap = LineCap.Round;
                    frontRingGlow.EndCap = LineCap.Round;
                    g.DrawArc(frontRingGlow, -rx, -ry, rx * 2, ry * 2, -5, 190);
                }

                // Front bright ring
                using (LinearGradientBrush frontRingBrush = new LinearGradientBrush(
                    new PointF(-rx, 0), new PointF(rx, 0),
                    Color.FromArgb(255, 56, 189, 248),
                    Color.FromArgb(255, 224, 242, 254)))
                using (Pen frontRingPen = new Pen(frontRingBrush, 5.5f * s))
                {
                    frontRingPen.StartCap = LineCap.Round;
                    frontRingPen.EndCap = LineCap.Round;
                    g.DrawArc(frontRingPen, -rx, -ry, rx * 2, ry * 2, -5, 190);
                }

                // Orbital Beacon / Satellite Node on the ring
                float nodeX = rx * 0.72f;
                float nodeY = (float)(ry * Math.Sqrt(Math.Max(0, 1.0 - Math.Pow(nodeX / rx, 2))));
                float nodeR = 6.5f * s;

                using (SolidBrush nodeGlow = new SolidBrush(Color.FromArgb(90, 56, 189, 248)))
                {
                    g.FillEllipse(nodeGlow, nodeX - nodeR * 2.2f, nodeY - nodeR * 2.2f, nodeR * 4.4f, nodeR * 4.4f);
                }
                using (SolidBrush nodeCore = new SolidBrush(Color.FromArgb(255, 255, 255, 255)))
                {
                    g.FillEllipse(nodeCore, nodeX - nodeR, nodeY - nodeR, nodeR * 2, nodeR * 2);
                }

                g.Restore(state2);

                // Atmosphere Exosphere Secondary Thin Ion Reticle (45 deg dashed accent)
                using (Pen reticlePen = new Pen(Color.FromArgb(65, 56, 189, 248), 1.5f * s))
                {
                    reticlePen.DashPattern = new float[] { 4f, 4f };
                    g.DrawEllipse(reticlePen, cx - 64f * s, cy - 64f * s, 128f * s, 128f * s);
                }

                // Top specular highlight star (Atmospheric twinkle)
                float starX = cx - 28f * s;
                float starY = cy - 28f * s;
                using (SolidBrush starBrush = new SolidBrush(Color.FromArgb(255, 255, 255, 255)))
                {
                    g.FillEllipse(starBrush, starX - 2.5f * s, starY - 2.5f * s, 5f * s, 5f * s);
                }

                g.ResetClip();
            }
            return bmp;
        }
    }
}
