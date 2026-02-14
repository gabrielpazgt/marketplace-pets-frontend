import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mp-account-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  // Mock de datos del usuario (edición local)
  model = {
    name: 'Aumakki User',
    email: 'hola@aumakki.com',
    phone: '',
    language: 'ES',
    currency: 'GTQ',
    timezone: 'America/Guatemala',
    newsletter: true,
    notifyOrders: true,
    notifyPromos: true,
    twoFactor: false,
  };

  saving = false;

  saveProfile() {
    this.saving = true;
    setTimeout(() => (this.saving = false), 600); // maqueta
  }

  savePrefs() {
    this.saving = true;
    setTimeout(() => (this.saving = false), 600);
  }

  changePassword() {
    alert('Abrir modal de cambio de contraseña (maqueta)');
  }

  toggle2FA() {
    this.model.twoFactor = !this.model.twoFactor;
  }

  deleteAccount() {
    const ok = confirm('¿Eliminar tu cuenta? Esta acción no se puede deshacer.');
    if (ok) alert('Cuenta marcada para eliminación (maqueta).');
  }
}
