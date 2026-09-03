import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { provideAllianzIcons } from '@allianz/ngx-brand-kit/icon';
import { provideA1Theme } from '@allianz/ngx-brand-kit/config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAllianzIcons(),
    provideA1Theme(),
  ],
};
