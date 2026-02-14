import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quantity-stepper',
  templateUrl: './quantity-stepper.component.html',
  styleUrls: ['./quantity-stepper.component.scss']
})
export class QuantityStepperComponent {
  @Input() value = 1;
  @Input() min = 1;
  @Input() max = 99;

  @Output() valueChange = new EventEmitter<number>();

  dec() { this.valueChange.emit(Math.max(this.min, this.value - 1)); }
  inc() { this.valueChange.emit(Math.min(this.max, this.value + 1)); }
}
