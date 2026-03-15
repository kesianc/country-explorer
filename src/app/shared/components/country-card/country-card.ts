import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CountrySummary } from '../../../core/models/country.model';

@Component({
  selector: 'app-country-card',
  imports: [CommonModule, RouterLink],
  templateUrl: './country-card.html',
  styleUrl: './country-card.scss',
})
export class CountryCardComponent {
  readonly country = input.required<CountrySummary>();
}
