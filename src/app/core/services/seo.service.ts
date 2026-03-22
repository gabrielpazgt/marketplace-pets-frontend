import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoPageConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  canonicalUrl?: string;
  type?: 'website' | 'product' | 'article';
  keywords?: string[];
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly canonicalId = 'app-canonical';
  private readonly schemaSelector = 'script[data-seo-schema="true"]';
  private readonly siteName = 'Aumakki';
  private readonly locale = 'es_GT';

  constructor(
    private title: Title,
    private meta: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  setPage(config: SeoPageConfig): void {
    const title = this.normalizeText(config.title);
    const description = this.normalizeText(config.description);
    const image = this.normalizeUrl(config.image);
    const url = this.normalizeUrl(config.url) || this.document.location?.href || '';
    const canonicalUrl = this.normalizeUrl(config.canonicalUrl || config.url) || url;
    const type = config.type || 'website';
    const keywords = (config.keywords || []).map((value) => this.normalizeText(value)).filter(Boolean);

    if (title) {
      this.title.setTitle(title);
      this.meta.updateTag({ property: 'og:title', content: title });
      this.meta.updateTag({ name: 'twitter:title', content: title });
    }

    if (description) {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ name: 'twitter:description', content: description });
    }

    if (url) {
      this.meta.updateTag({ property: 'og:url', content: url });
    }

    if (canonicalUrl) {
      this.setCanonical(canonicalUrl);
    }

    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: this.siteName });
    this.meta.updateTag({ property: 'og:locale', content: this.locale });
    this.meta.updateTag({ name: 'application-name', content: this.siteName });
    this.meta.updateTag({ name: 'apple-mobile-web-app-title', content: this.siteName });
    this.meta.updateTag({ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });

    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ name: 'twitter:image', content: image });
    } else {
      this.meta.removeTag(`property='og:image'`);
      this.meta.removeTag(`name='twitter:image'`);
    }

    if (keywords.length) {
      this.meta.updateTag({ name: 'keywords', content: keywords.join(', ') });
    } else {
      this.meta.removeTag(`name='keywords'`);
    }

    this.meta.updateTag({
      name: 'robots',
      content: config.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'
    });

    this.setStructuredData(config.structuredData);
  }

  clearStructuredData(): void {
    this.document.querySelectorAll(this.schemaSelector).forEach((element) => element.remove());
  }

  absoluteUrl(path = ''): string {
    return this.normalizeUrl(path) || (this.document.location?.origin || '');
  }

  private setCanonical(url: string): void {
    let link = this.document.getElementById(this.canonicalId) as HTMLLinkElement | null;

    if (!link) {
      link = this.document.createElement('link');
      link.id = this.canonicalId;
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }

    link.href = url;
  }

  private setStructuredData(
    data?: Record<string, unknown> | Array<Record<string, unknown>>
  ): void {
    this.clearStructuredData();
    if (!data) return;

    const items = Array.isArray(data) ? data : [data];

    for (const item of items) {
      const script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-schema', 'true');
      script.text = JSON.stringify(item);
      this.document.head.appendChild(script);
    }
  }

  private normalizeText(value: string | undefined): string {
    return String(value || '').trim();
  }

  private normalizeUrl(value?: string): string {
    const normalized = this.normalizeText(value);
    if (!normalized) return '';
    if (/^https?:\/\//i.test(normalized)) return normalized;

    const origin = this.document.location?.origin || '';
    return normalized.startsWith('/') ? `${origin}${normalized}` : `${origin}/${normalized}`;
  }
}
