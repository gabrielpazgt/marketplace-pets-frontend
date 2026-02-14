import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeShippingComponent } from './free-shipping.component';

describe('FreeShippingComponent', () => {
  let component: FreeShippingComponent;
  let fixture: ComponentFixture<FreeShippingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FreeShippingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FreeShippingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
