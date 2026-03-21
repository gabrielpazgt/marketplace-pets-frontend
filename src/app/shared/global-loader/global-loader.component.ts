import { Component } from '@angular/core';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  standalone: false,
  selector: 'app-global-loader',
  templateUrl: './global-loader.component.html',
  styleUrls: ['./global-loader.component.scss']
})
export class GlobalLoaderComponent {
  readonly isLoading$ = this.loading.isLoading$;
  readonly label$ = this.loading.label$;

  constructor(private loading: LoadingService) {}
}
