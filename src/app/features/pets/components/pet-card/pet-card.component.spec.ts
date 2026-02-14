import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PetCarComponent } from './pet-card.component';

describe('PetCarComponent', () => {
  let component: PetCarComponent;
  let fixture: ComponentFixture<PetCarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PetCarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PetCarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
