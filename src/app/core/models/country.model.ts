export type CountryRegion =
  | 'Africa'
  | 'Americas'
  | 'Asia'
  | 'Europe'
  | 'Oceania'
  | 'Antarctic'
  | 'Unknown';

export type CountrySortOption = 'name' | 'population' | 'area';

export interface CountrySummary {
  code: string;
  name: string;
  officialName: string;
  region: CountryRegion;
  subregion: string;
  capital: string;
  population: number;
  area: number;
  flagAlt: string;
  flagUrl: string;
}

export interface CountryDetail extends CountrySummary {
  nativeName: string;
  topLevelDomain: string[];
  currencies: string[];
  languages: string[];
  borders: string[];
  continents: string[];
  mapsUrl: string;
  timezones: string[];
  startOfWeek: string;
}
