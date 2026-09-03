import { Routes } from '@angular/router';
import { Login } from './login/login';
import { MyComponent } from './my-component/my-component';
import { CoveragesComponent } from './coverages/coverages';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'locations', component: MyComponent },
  { path: 'coverages', component: CoveragesComponent },
  { path: '', redirectTo: 'coverages', pathMatch: 'full' },
];
