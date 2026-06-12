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
  selector: 'app-driver-create',
  imports: [RouterLink, PageHeader, TranslatePipe, DriverFormComponent],
  templateUrl: './driver-create.component.html',
  styleUrl: './driver-create.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriverCreateComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  groupId = '';

  ngOnInit(): void {
    this.groupId = this.route.snapshot.paramMap.get('id') ?? '';
  }
}
