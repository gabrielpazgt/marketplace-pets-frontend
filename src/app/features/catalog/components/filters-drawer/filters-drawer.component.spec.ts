import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltersDrawerComponent } from './filters-drawer.component';

describe('FiltersDrawerComponent', () => {
  let component: FiltersDrawerComponent;
  let fixture: ComponentFixture<FiltersDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FiltersDrawerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FiltersDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
