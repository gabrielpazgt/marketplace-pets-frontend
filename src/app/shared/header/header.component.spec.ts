import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { StorefrontApiService } from '../../core/services/storefront-api.service';
import { CartStateService } from '../../features/cart/services/cart-state.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(async () => {
    routerEvents$ = new Subject<NavigationEnd>();

    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/home',
            events: routerEvents$,
            navigate: jasmine.createSpy('navigate'),
          },
        },
        {
          provide: CartStateService,
          useValue: {
            items$: of([]),
            itemCount$: of(0),
            subtotal$: of(0),
            total$: of(0),
            notifications$: new Subject(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            user$: of(null),
            logout: jasmine.createSpy('logout'),
          },
        },
        {
          provide: StorefrontApiService,
          useValue: {
            listHeaderAnnouncements: () => of({ data: [] }),
            getCatalogTaxonomy: () => of({ data: { animals: [] } }),
            resolveMediaUrl: (value: string | null) => value,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close the explore drawer after route navigation', () => {
    component.exploreDrawerOpen = true;
    component.activeExploreAnimalKey = 'dog';

    routerEvents$.next(new NavigationEnd(1, '/catalog', '/catalog?petType=dog'));

    expect(component.exploreDrawerOpen).toBeFalse();
    expect(component.activeExploreAnimalKey).toBeNull();
  });

  it('should toggle the explore drawer on desktop viewport', () => {
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1280);
    component.onWindowResize();

    component.toggleExploreDrawer();
    expect(component.exploreDrawerOpen).toBeTrue();

    component.toggleExploreDrawer();
    expect(component.exploreDrawerOpen).toBeFalse();
  });
});
