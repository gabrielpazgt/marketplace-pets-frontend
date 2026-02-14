import { TestBed } from '@angular/core/testing';

import { CatalogMockService } from './catalog-mock.service';

describe('CatalogMockService', () => {
  let service: CatalogMockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CatalogMockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
