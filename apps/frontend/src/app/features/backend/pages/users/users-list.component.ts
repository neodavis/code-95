import {
  Component,
  DestroyRef,
  inject,
  type OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Observable } from 'rxjs';
import {
  AbstractListComponent,
  DataTable,
  DataTableColumn,
  type DataTablePage,
  PageHeader,
  TranslatePipe,
  TranslationService,
} from '@code95/ui';
import { type SortOrder, type UserListItem } from '@code95/shared-types';
import { UsersApiService } from '../../../../core/services/users-api.service';

@Component({
  selector: 'app-users-list',
  imports: [PageHeader, DataTable, DataTableColumn, RouterLink, TranslatePipe],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent
  extends AbstractListComponent<UserListItem>
  implements OnInit
{
  private readonly usersApi = inject(UsersApiService);
  private readonly t = inject(TranslationService);
  protected readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.initList();
  }

  protected fetchData(
    page: number,
    pageSize: number,
    sort?: string,
    order?: SortOrder,
    search?: string,
  ): Observable<DataTablePage<UserListItem>> {
    return this.usersApi.getAll(page, pageSize, sort, order, search);
  }

  fullName(item: UserListItem): string {
    return (
      [item.lastName, item.firstName, item.middleName]
        .filter((s) => !!s)
        .join(' ') || '—'
    );
  }

  deactivate(item: UserListItem): void {
    if (!confirm(this.t.translate('confirm.delete_user'))) return;
    this.usersApi.delete(item.id).subscribe({
      next: () => this.reload(),
    });
  }
}
