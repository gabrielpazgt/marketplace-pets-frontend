import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountShellComponent } from './account-shell.component';

describe('AccountShellComponent', () => {
  let component: AccountShellComponent;
  let fixture: ComponentFixture<AccountShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccountShellComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AccountShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
