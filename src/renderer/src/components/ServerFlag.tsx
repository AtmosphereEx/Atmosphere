import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';
import { Globe } from 'lucide-react';

const KEYWORD_MAP: Record<string, string> = {
  // Russian & English keywords
  'россия': 'RU', 'russia': 'RU', 'moscow': 'RU', 'москва': 'RU', 'питер': 'RU', 'spb': 'RU', 'ru': 'RU',
  'эстония': 'EE', 'estonia': 'EE', 'tallinn': 'EE', 'таллин': 'EE', 'таллинн': 'EE', 'ee': 'EE',
  'германия': 'DE', 'germany': 'DE', 'deutschland': 'DE', 'frankfurt': 'DE', 'франкфурт': 'DE', 'berlin': 'DE', 'берлин': 'DE', 'de': 'DE',
  'нидерланды': 'NL', 'голландия': 'NL', 'netherlands': 'NL', 'holland': 'NL', 'amsterdam': 'NL', 'амстердам': 'NL', 'nl': 'NL',
  'финляндия': 'FI', 'finland': 'FI', 'helsinki': 'FI', 'хельсинки': 'FI', 'fi': 'FI',
  'сша': 'US', 'usa': 'US', 'united states': 'US', 'штаты': 'US', 'америка': 'US', 'us': 'US',
  'турция': 'TR', 'turkey': 'TR', 'istanbul': 'TR', 'стамбул': 'TR', 'tr': 'TR',
  'великобритания': 'GB', 'англия': 'GB', 'uk': 'GB', 'united kingdom': 'GB', 'london': 'GB', 'лондон': 'GB', 'gb': 'GB',
  'швеция': 'SE', 'sweden': 'SE', 'stockholm': 'SE', 'стокгольм': 'SE', 'se': 'SE',
  'польша': 'PL', 'poland': 'PL', 'warsaw': 'PL', 'варшава': 'PL', 'pl': 'PL',
  'казахстан': 'KZ', 'kazakhstan': 'KZ', 'almaty': 'KZ', 'алматы': 'KZ', 'astana': 'KZ', 'астана': 'KZ', 'kz': 'KZ',
  'франция': 'FR', 'france': 'FR', 'paris': 'FR', 'париж': 'FR', 'fr': 'FR',
  'испания': 'ES', 'spain': 'ES', 'madrid': 'ES', 'мадрид': 'ES', 'es': 'ES',
  'италия': 'IT', 'italy': 'IT', 'rome': 'IT', 'рим': 'IT', 'milan': 'IT', 'милан': 'IT', 'it': 'IT',
  'украина': 'UA', 'ukraine': 'UA', 'kyiv': 'UA', 'kiev': 'UA', 'киев': 'UA', 'ua': 'UA',
  'беларусь': 'BY', 'belarus': 'BY', 'minsk': 'BY', 'минск': 'BY', 'by': 'BY',
  'япония': 'JP', 'japan': 'JP', 'tokyo': 'JP', 'токио': 'JP', 'jp': 'JP',
  'сингапур': 'SG', 'singapore': 'SG', 'sg': 'SG',
  'канада': 'CA', 'canada': 'CA', 'toronto': 'CA', 'торонто': 'CA', 'ca': 'CA',
  'швейцария': 'CH', 'switzerland': 'CH', 'zurich': 'CH', 'цюрих': 'CH', 'ch': 'CH',
  'австрия': 'AT', 'austria': 'AT', 'vienna': 'AT', 'вена': 'AT', 'at': 'AT',
  'чехия': 'CZ', 'czech': 'CZ', 'prague': 'CZ', 'прага': 'CZ', 'cz': 'CZ',
  'литва': 'LT', 'lithuania': 'LT', 'vilnius': 'LT', 'вильнюс': 'LT', 'lt': 'LT',
  'латвия': 'LV', 'latvia': 'LV', 'riga': 'LV', 'рига': 'LV', 'lv': 'LV',
  'грузия': 'GE', 'georgia': 'GE', 'tbilisi': 'GE', 'тбилиси': 'GE', 'ge': 'GE',
  'армения': 'AM', 'armenia': 'AM', 'yerevan': 'AM', 'ереван': 'AM', 'am': 'AM',
  'узбекистан': 'UZ', 'uzbekistan': 'UZ', 'tashkent': 'UZ', 'ташкент': 'UZ', 'uz': 'UZ',
  'оаэ': 'AE', 'uae': 'AE', 'dubai': 'AE', 'дубай': 'AE', 'ae': 'AE',
  'кипр': 'CY', 'cyprus': 'CY', 'cy': 'CY',
  'корея': 'KR', 'korea': 'KR', 'seoul': 'KR', 'сеул': 'KR', 'kr': 'KR',
  'гонконг': 'HK', 'hong kong': 'HK', 'hk': 'HK',
  'бразилия': 'BR', 'brazil': 'BR', 'br': 'BR',
  'австралия': 'AU', 'australia': 'AU', 'sydney': 'AU', 'au': 'AU',
  'норвегия': 'NO', 'norway': 'NO', 'oslo': 'NO', 'осло': 'NO', 'no': 'NO',
  'дания': 'DK', 'denmark': 'DK', 'copenhagen': 'DK', 'копенгаген': 'DK', 'dk': 'DK',
  'ирландия': 'IE', 'ireland': 'IE', 'dublin': 'IE', 'дублин': 'IE', 'ie': 'IE',
  'португалия': 'PT', 'portugal': 'PT', 'lisbon': 'PT', 'лиссабон': 'PT', 'pt': 'PT',
  'бельгия': 'BE', 'belgium': 'BE', 'brussels': 'BE', 'брюссель': 'BE', 'be': 'BE',
  'румыния': 'RO', 'romania': 'RO', 'bucharest': 'RO', 'бухарест': 'RO', 'ro': 'RO',
  'болгария': 'BG', 'bulgaria': 'BG', 'sofia': 'BG', 'софия': 'BG', 'bg': 'BG',
  'молдова': 'MD', 'moldova': 'MD', 'chisinau': 'MD', 'кишинев': 'MD', 'md': 'MD',
  'венгрия': 'HU', 'hungary': 'HU', 'budapest': 'HU', 'будапешт': 'HU', 'hu': 'HU',
  'сербия': 'RS', 'serbia': 'RS', 'belgrade': 'RS', 'белград': 'RS', 'rs': 'RS',
  'греция': 'GR', 'greece': 'GR', 'athens': 'GR', 'афины': 'GR', 'gr': 'GR',
  'индия': 'IN', 'india': 'IN', 'mumbai': 'IN', 'мумбаи': 'IN', 'in': 'IN',
  'израиль': 'IL', 'israel': 'IL', 'tel aviv': 'IL', 'тель-авив': 'IL', 'il': 'IL'
};

// Pre-compiled regex entries for fast lookup without per-render allocations
const PRECOMPILED_KEYWORD_RULES: Array<{ regex: RegExp; code: string }> = Object.entries(KEYWORD_MAP).map(
  ([kw, code]) => ({
    regex: new RegExp(`(^|[^a-zа-я0-9])${kw}([^a-zа-я0-9]|$)`, 'i'),
    code,
  })
);

export function getCountryCodeFromEmoji(str?: string): string | null {
  if (!str) return null;
  try {
    for (let i = 0; i < str.length; i++) {
      const cp1 = str.codePointAt(i);
      if (cp1 && cp1 >= 0x1F1E6 && cp1 <= 0x1F1FF) {
        const nextIdx = i + (cp1 > 0xFFFF ? 2 : 1);
        if (nextIdx < str.length) {
          const cp2 = str.codePointAt(nextIdx);
          if (cp2 && cp2 >= 0x1F1E6 && cp2 <= 0x1F1FF) {
            const char1 = String.fromCharCode(cp1 - 0x1F1E6 + 65);
            const char2 = String.fromCharCode(cp2 - 0x1F1E6 + 65);
            return (char1 + char2).toUpperCase();
          }
        }
      }
    }
  } catch { }
  return null;
}

export function detectCountryCode(name?: string): string | null {
  if (!name) return null;
  try {
    // 1. Check flag emoji in name
    const fromEmoji = getCountryCodeFromEmoji(name);
    if (fromEmoji) return fromEmoji;

    // 2. Check precompiled keyword rules
    const clean = name.toLowerCase();
    for (let i = 0; i < PRECOMPILED_KEYWORD_RULES.length; i++) {
      if (PRECOMPILED_KEYWORD_RULES[i].regex.test(clean)) {
        return PRECOMPILED_KEYWORD_RULES[i].code;
      }
    }
  } catch { }

  return null;
}

export function cleanNodeName(name?: string): string {
  if (!name) return '';
  try {
    // Strip regional indicator flag emoji pairs
    const stripped = name.replace(/[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/g, '').trim();
    // Strip leading pipes, dashes, or separators
    const cleaned = stripped.replace(/^[\s\|\-\:\.]+/g, '').trim();
    return cleaned || name;
  } catch {
    return name;
  }
}

interface ServerFlagProps {
  name?: string;
  className?: string;
  showFallbackGlobe?: boolean;
}

export const ServerFlag: React.FC<ServerFlagProps> = ({
  name = '',
  className = "w-5 h-3.5",
  showFallbackGlobe = true,
}) => {
  const code = detectCountryCode(name);
  const FlagComponent = code && (Flags as any)[code] ? (Flags as any)[code] : null;

  if (FlagComponent) {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 overflow-hidden rounded-[3px] border border-white/15 shadow-xs align-middle ${className}`}>
        <FlagComponent className="w-full h-full object-cover" />
      </span>
    );
  }

  if (showFallbackGlobe) {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 rounded-[3px] bg-zinc-800 border border-zinc-700 text-zinc-400 align-middle ${className}`}>
        <Globe className="w-3 h-3 text-zinc-400" />
      </span>
    );
  }

  return null;
};
