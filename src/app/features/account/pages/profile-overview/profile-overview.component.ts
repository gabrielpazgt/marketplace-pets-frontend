import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// (mock) en lo que se integra AuthService real
function devUserId() { return 'dev-user'; }

type Address = {
  id: string;
  userId: string;
  label: string;        // Casa, Trabajo, etc.
  recipient: string;    // A nombre de
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  instructions?: string;
  isDefault?: boolean;
  createdAt: string; updatedAt: string;
};

const ADDR_KEY = 'mp_addresses';

@Component({
  selector: 'app-profile-overview',
  templateUrl: './profile-overview.component.html',
  styleUrls: ['./profile-overview.component.scss']
})
export class ProfileOverviewComponent implements OnInit {

  // Mock de datos del usuario (conecta luego a AuthService/ProfileService)
  user = {
    id: devUserId(),
    name: 'Aumakki User',
    email: 'hola@aumakki.com',
    gender: 'male' as 'male' | 'female' | undefined, // ⬅️ setea 'male' | 'female' | undefined
    membership: 'Free',        // Free | Premium | VIP
    points: 120,
    ordersCount: 3,
    petsCount: 2
  };

  /** URL del avatar según sexo; si no hay género, retorna null y mostramos la inicial */
  get avatarUrl(): string | null {
    if (this.user.gender === 'male')   return 'assets/icons/account/boy.png';
    if (this.user.gender === 'female') return 'assets/icons/account/girl.png';
    return null;
  }

  // Quick prefs (se conectan luego)
  prefs = {
    locale: 'ES',
    currency: 'GTQ',
    newsletter: true,
    notifyPromos: true,
    notifyOrders: true
  };

  // Direcciones
  addresses: Address[] = [];
  formOpen = false;
  formMode: 'create' | 'edit' = 'create';
  editingId: string | null = null;
  addrForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.addrForm = this.fb.group({
      label: ['', [Validators.required, Validators.maxLength(24)]],
      recipient: ['', [Validators.required, Validators.maxLength(80)]],
      phone: [''],
      line1: ['', [Validators.required, Validators.maxLength(120)]],
      line2: [''],
      city: ['', [Validators.required, Validators.maxLength(60)]],
      state: [''],
      zip: [''],
      country: ['Guatemala', [Validators.required]],
      instructions: ['']
    });

    this.load();
  }

  // ====== Direcciones (localStorage demo) ======
  private read(): Address[] {
    try {
      const raw = localStorage.getItem(ADDR_KEY);
      return raw ? JSON.parse(raw) as Address[] : [];
    } catch { return []; }
  }
  private persist(list: Address[]) {
    localStorage.setItem(ADDR_KEY, JSON.stringify(list));
  }
  private uid() { return 'a_' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

  load() {
    const all = this.read();
    this.addresses = all.filter(a => a.userId === this.user.id);
  }

  openCreate() {
    this.formOpen = true;
    this.formMode = 'create';
    this.editingId = null;
    this.addrForm.reset({
      label: 'Casa',
      recipient: this.user.name,
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
      country: 'Guatemala',
      instructions: ''
    });
  }

  openEdit(a: Address) {
    this.formOpen = true;
    this.formMode = 'edit';
    this.editingId = a.id;
    this.addrForm.patchValue({
      label: a.label,
      recipient: a.recipient,
      phone: a.phone || '',
      line1: a.line1,
      line2: a.line2 || '',
      city: a.city,
      state: a.state || '',
      zip: a.zip || '',
      country: a.country,
      instructions: a.instructions || ''
    });
  }

  cancelForm() {
    this.formOpen = false;
    this.addrForm.reset();
    this.editingId = null;
  }

  saveAddress() {
    if (this.addrForm.invalid) {
      this.addrForm.markAllAsTouched();
      return;
    }
    const v = this.addrForm.value;
    const now = new Date().toISOString();

    const all = this.read();
    if (this.formMode === 'create') {
      const addr: Address = {
        id: this.uid(),
        userId: this.user.id,
        label: v.label,
        recipient: v.recipient,
        phone: v.phone || undefined,
        line1: v.line1,
        line2: v.line2 || undefined,
        city: v.city,
        state: v.state || undefined,
        zip: v.zip || undefined,
        country: v.country,
        instructions: v.instructions || undefined,
        isDefault: all.filter(a => a.userId === this.user.id).length === 0, // primera = default
        createdAt: now, updatedAt: now
      };
      all.push(addr);
    } else if (this.editingId) {
      const idx = all.findIndex(a => a.id === this.editingId);
      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          ...v,
          phone: v.phone || undefined,
          line2: v.line2 || undefined,
          state: v.state || undefined,
          zip: v.zip || undefined,
          instructions: v.instructions || undefined,
          updatedAt: now
        };
      }
    }

    this.persist(all);
    this.cancelForm();
    this.load();
  }

  setDefault(a: Address) {
    const all = this.read();
    const byUser = all.map(x =>
      x.userId === this.user.id ? { ...x, isDefault: x.id === a.id } : x
    );
    this.persist(byUser);
    this.load();
  }

  remove(a: Address) {
    if (!confirm(`¿Eliminar la dirección "${a.label}"?`)) return;
    const all = this.read().filter(x => x.id !== a.id);
    // Si eliminamos la default, pone otra del usuario como default
    const still = all.filter(x => x.userId === this.user.id);
    if (still.length && !still.some(x => x.isDefault)) {
      still[0].isDefault = true;
      const idx = all.findIndex(x => x.id === still[0].id);
      if (idx >= 0) all[idx] = still[0];
    }
    this.persist(all);
    this.load();
  }

  // ====== Helpers UI ======
  get defaultAddress(): Address | undefined {
    return this.addresses.find(a => a.isDefault);
  }

  kpiLabel(n: number) {
    return n === 1 ? 'pedido' : 'pedidos';
  }
}
