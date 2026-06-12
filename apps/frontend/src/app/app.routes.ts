import { type Route } from '@angular/router';
import {
  employeeGuard,
  guestGuard,
  superuserGuard,
} from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./features/public/public.component').then(
        (m) => m.PublicComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'training-centers',
        pathMatch: 'full',
      },
      {
        path: 'training-centers',
        loadComponent: () =>
          import(
            './features/public/pages/training-centers/training-centers.component'
          ).then((m) => m.TrainingCentersComponent),
      },
      {
        path: 'news',
        loadComponent: () =>
          import('./features/public/pages/news-list/news-list.component').then(
            (m) => m.NewsListComponent,
          ),
      },
      {
        path: 'news/:slug',
        loadComponent: () =>
          import(
            './features/public/pages/news-detail/news-detail.component'
          ).then((m) => m.NewsDetailComponent),
      },
      {
        path: 'faq',
        loadComponent: () =>
          import('./features/public/pages/faq/faq.component').then(
            (m) => m.FaqComponent,
          ),
      },
      {
        path: 'registry/:id',
        loadComponent: () =>
          import(
            './features/public/pages/registry/registry-detail.component'
          ).then((m) => m.RegistryDetailComponent),
      },
    ],
  },
  {
    path: 'cabinet',
    canActivate: [employeeGuard],
    loadComponent: () =>
      import('./features/cabinet/cabinet.component').then(
        (m) => m.CabinetComponent,
      ),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/cabinet/pages/home/cabinet-home.component').then(
            (m) => m.CabinetHomeComponent,
          ),
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import(
            './features/cabinet/pages/drivers/drivers-list.component'
          ).then((m) => m.DriversListComponent),
      },
      {
        path: 'drivers/create',
        loadComponent: () =>
          import(
            './features/cabinet/pages/drivers/driver-create.component'
          ).then((m) => m.DriverCreateComponent),
      },
      {
        path: 'drivers/:id',
        loadComponent: () =>
          import('./features/cabinet/pages/drivers/driver-view.component').then(
            (m) => m.DriverViewComponent,
          ),
      },
      {
        path: 'drivers/:id/edit',
        loadComponent: () =>
          import('./features/cabinet/pages/drivers/driver-edit.component').then(
            (m) => m.DriverEditComponent,
          ),
      },
      {
        path: 'graduates',
        loadComponent: () =>
          import(
            './features/cabinet/pages/graduates/graduates-list.component'
          ).then((m) => m.GraduatesListComponent),
      },
      {
        path: 'study-groups',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/study-groups-list.component'
          ).then((m) => m.StudyGroupsListComponent),
      },
      {
        path: 'study-groups/create',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/study-group-form.component'
          ).then((m) => m.StudyGroupFormComponent),
      },
      {
        path: 'study-groups/:id/edit',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/study-group-form.component'
          ).then((m) => m.StudyGroupFormComponent),
      },
      {
        path: 'study-groups/:id/add-driver',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/driver-create.component'
          ).then((m) => m.DriverCreateComponent),
      },
      {
        path: 'study-groups/:id/search-driver',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/driver-search.component'
          ).then((m) => m.DriverSearchComponent),
      },
      {
        path: 'study-groups/:id/spk',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/spk-form.component'
          ).then((m) => m.SpkFormComponent),
      },
      {
        path: 'study-groups/:id/ecard/:driverId',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/ecard-form.component'
          ).then((m) => m.ECardFormComponent),
      },
      {
        path: 'study-groups/:id',
        loadComponent: () =>
          import(
            './features/cabinet/pages/study-groups/study-group-detail.component'
          ).then((m) => m.StudyGroupDetailComponent),
      },
      {
        path: 'espk/:id',
        loadComponent: () =>
          import('./features/cabinet/pages/espk/spk-detail.component').then(
            (m) => m.SpkDetailComponent,
          ),
      },
      {
        path: 'espk/:id/edit',
        loadComponent: () =>
          import('./features/cabinet/pages/espk/spk-edit.component').then(
            (m) => m.SpkEditComponent,
          ),
      },
      {
        path: 'ecards/:id',
        loadComponent: () =>
          import('./features/cabinet/pages/ecards/ecard-detail.component').then(
            (m) => m.ECardDetailComponent,
          ),
      },
      {
        path: 'ecards/:id/edit',
        loadComponent: () =>
          import('./features/cabinet/pages/ecards/ecard-edit.component').then(
            (m) => m.ECardEditComponent,
          ),
      },
    ],
  },
  {
    path: 'backend',
    canActivate: [superuserGuard],
    loadComponent: () =>
      import('./features/backend/backend.component').then(
        (m) => m.BackendComponent,
      ),
    children: [
      { path: '', redirectTo: 'articles', pathMatch: 'full' },
      {
        path: 'articles',
        loadComponent: () =>
          import(
            './features/backend/pages/articles/articles-list.component'
          ).then((m) => m.ArticlesListComponent),
      },
      {
        path: 'articles/create',
        loadComponent: () =>
          import(
            './features/backend/pages/articles/article-form.component'
          ).then((m) => m.ArticleFormComponent),
      },
      {
        path: 'articles/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/articles/article-form.component'
          ).then((m) => m.ArticleFormComponent),
      },
      {
        path: 'article-categories',
        loadComponent: () =>
          import(
            './features/backend/pages/article-categories/article-categories-list.component'
          ).then((m) => m.ArticleCategoriesListComponent),
      },
      {
        path: 'article-categories/create',
        loadComponent: () =>
          import(
            './features/backend/pages/article-categories/article-category-form.component'
          ).then((m) => m.ArticleCategoryFormComponent),
      },
      {
        path: 'article-categories/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/article-categories/article-category-form.component'
          ).then((m) => m.ArticleCategoryFormComponent),
      },
      {
        path: 'article-tags',
        loadComponent: () =>
          import(
            './features/backend/pages/article-tags/article-tags-list.component'
          ).then((m) => m.ArticleTagsListComponent),
      },
      {
        path: 'article-tags/create',
        loadComponent: () =>
          import(
            './features/backend/pages/article-tags/article-tag-form.component'
          ).then((m) => m.ArticleTagFormComponent),
      },
      {
        path: 'article-tags/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/article-tags/article-tag-form.component'
          ).then((m) => m.ArticleTagFormComponent),
      },
      {
        path: 'faq',
        loadComponent: () =>
          import(
            './features/backend/pages/faq/backend-faq-list.component'
          ).then((m) => m.BackendFaqListComponent),
      },
      {
        path: 'faq/create',
        loadComponent: () =>
          import(
            './features/backend/pages/faq/backend-faq-form.component'
          ).then((m) => m.BackendFaqFormComponent),
      },
      {
        path: 'faq/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/faq/backend-faq-form.component'
          ).then((m) => m.BackendFaqFormComponent),
      },
      {
        path: 'training-centers',
        loadComponent: () =>
          import(
            './features/backend/pages/training-centers/backend-tc-list.component'
          ).then((m) => m.BackendTcListComponent),
      },
      {
        path: 'training-centers/create',
        loadComponent: () =>
          import(
            './features/backend/pages/training-centers/backend-tc-form.component'
          ).then((m) => m.BackendTcFormComponent),
      },
      {
        path: 'training-centers/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/training-centers/backend-tc-form.component'
          ).then((m) => m.BackendTcFormComponent),
      },
      {
        path: 'employees',
        loadComponent: () =>
          import(
            './features/backend/pages/employees/employees-list.component'
          ).then((m) => m.EmployeesListComponent),
      },
      {
        path: 'employees/create',
        loadComponent: () =>
          import(
            './features/backend/pages/employees/employee-form.component'
          ).then((m) => m.EmployeeFormComponent),
      },
      {
        path: 'employees/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/employees/employee-form.component'
          ).then((m) => m.EmployeeFormComponent),
      },
      {
        path: 'carry-types',
        loadComponent: () =>
          import(
            './features/backend/pages/carry-types/carry-types-list.component'
          ).then((m) => m.CarryTypesListComponent),
      },
      {
        path: 'carry-types/create',
        loadComponent: () =>
          import(
            './features/backend/pages/carry-types/carry-type-form.component'
          ).then((m) => m.CarryTypeFormComponent),
      },
      {
        path: 'carry-types/:id/edit',
        loadComponent: () =>
          import(
            './features/backend/pages/carry-types/carry-type-form.component'
          ).then((m) => m.CarryTypeFormComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/backend/pages/users/users-list.component').then(
            (m) => m.UsersListComponent,
          ),
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import(
            './features/backend/pages/audit-logs/audit-logs-list.component'
          ).then((m) => m.AuditLogsListComponent),
      },
      {
        path: 'users/create',
        loadComponent: () =>
          import('./features/backend/pages/users/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
      },
      {
        path: 'users/:id/edit',
        loadComponent: () =>
          import('./features/backend/pages/users/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
      },
    ],
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
