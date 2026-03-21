import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PetPreviewComponent } from './pet-preview.component';

describe('PetPreviewComponent', () => {
  let component: PetPreviewComponent;
  let fixture: ComponentFixture<PetPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PetPreviewComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PetPreviewComponent);
    component = fixture.componentInstance;
    component.draft = {
      name: 'Luna',
      species: 'dog',
      avatarHex: '#ffaa00',
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
