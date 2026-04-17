import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { FiltersDrawerComponent } from './filters-drawer.component';

describe('FiltersDrawerComponent', () => {
  let component: FiltersDrawerComponent;
  let fixture: ComponentFixture<FiltersDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FiltersDrawerComponent],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: StorefrontApiService,
          useValue: {
            resolveMediaUrl: (url?: string | null) => url || '',
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FiltersDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
