import { TestBed } from '@angular/core/testing';

import { PetStateService } from './pet-state.service';

describe('PetStateService', () => {
  let service: PetStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PetStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
