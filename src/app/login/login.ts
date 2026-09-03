import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NxFormfieldComponent, NxFormfieldErrorDirective } from '@allianz/ng-aquila/formfield';
import { NxInputDirective } from '@allianz/ng-aquila/input';
import { NxButtonComponent } from '@allianz/ng-aquila/button';
import { NxCheckboxComponent } from '@allianz/ng-aquila/checkbox';
import { NxLinkComponent } from '@allianz/ng-aquila/link';
import { NxHeadlineComponent } from '@allianz/ng-aquila/headline';
import { NxIconComponent } from '@allianz/ng-aquila/icon';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    NxFormfieldComponent,
    NxFormfieldErrorDirective,
    NxInputDirective,
    NxButtonComponent,
    NxCheckboxComponent,
    NxLinkComponent,
    NxHeadlineComponent,
    NxIconComponent,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginForm: FormGroup;
  hidePassword = true;

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      console.log('Login submitted', this.loginForm.value);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }
}
