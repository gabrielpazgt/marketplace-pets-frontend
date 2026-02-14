import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  public currentYear = new Date().getFullYear();

  socialLogos = [
    { src: 'assets/images/logos/instagram.png',        alt: 'Instagram'    ,href: '#' },
    { src: 'assets/images/logos/facebook.png',  alt: 'Facebook'     ,href: '#' },
    { src: 'assets/images/logos/youtube.png',        alt: 'Youtube',href: '#' },
    { src: 'assets/images/logos/tiktok.png',      alt: 'Tiktok',          href: '#' },

  ];
}
