import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeader, TranslatePipe } from '@code95/ui';
import { DriverFormComponent } from '../../components/driver-form/driver-form.component';

@Component({
  selector: 'app-driver-edit',
  imports: [RouterLink, PageHeader, TranslatePipe, DriverFormComponent],
  templateUrl: './driver-edit.component.html',
  styleUrl: './driver-edit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  driverId = 0;

  ngOnInit(): void {
    this.driverId = Number(this.route.snapshot.paramMap.get('id'));
  }
}
