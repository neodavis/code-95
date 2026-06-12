import { Component, ChangeDetectionStrategy } from '@angular/core';
import { PageHeader, TranslatePipe } from '@code95/ui';

interface RegistryEntry {
  driver: string;
  carryType: string;
  trainingCenter: string;
}

@Component({
  selector: 'app-registry',
  imports: [PageHeader, TranslatePipe],
  templateUrl: './registry.component.html',
  styleUrl: './registry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryComponent {
  entries: RegistryEntry[] = [];
}
