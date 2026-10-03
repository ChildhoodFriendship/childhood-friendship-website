/** Progetti esposti nella galleria 3D dell'hero. */
export interface ProjectExhibit {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly tech: readonly string[];
  readonly metrics: string;
  readonly link?: string;
  readonly color: number;
}

export const VAULT_PROJECTS: readonly ProjectExhibit[] = [] = [
    {
      id: 'core-web',
      title: 'Siti & Web App',
      category: 'Digital Architecture',
      description: 'Piattaforme web performanti, veloci, responsive e ottimizzate per massimizzare conversioni e scalabilità.',
      tech: ['Angular', 'Next.js', 'TypeScript', 'Tailwind'],
      metrics: 'Ultra-fast · Solid Foundations',
      color: 0x8b5cf6
    },
    {
      id: 'custom-software',
      title: 'Software su Misura',
      category: 'Bespoke Engineering',
      description: 'Architetture e gestionali costruiti attorno ai reali processi aziendali, senza vincoli di piattaforme preconfezionate.',
      tech: ['Cloud Architecture', 'Node.js', 'PostgreSQL', 'APIs'],
      metrics: 'Custom Built · Zero Compromises',
      color: 0x7c3aed
    },
    {
      id: 'mobile-ecosystem',
      title: 'App Mobile & Prodotti',
      category: 'Cross-Platform',
      description: 'Applicazioni native e cross-platform stabili, curate in ogni dettaglio interattivo e pronte a scalare.',
      tech: ['iOS', 'Android', 'Flutter', 'React Native'],
      metrics: 'Seamless UX · Production Ready',
      color: 0x4ade80
      },
      {
        id: 'ecommerce',
        title: 'E-Commerce Avanzati',
        category: 'Digital Retail',
        description: 'Piattaforme di vendita veloci, sicure e ottimizzate per la conversione.',
        tech: ['Shopify', 'Stripe', 'Next.js'],
        metrics: 'High Conversion · Secure',
        color: 0xfacc15
      },
      {
        id: 'ai-integration',
        title: 'AI & Automazione',
        category: 'Machine Learning',
        description: 'Integrazione di intelligenza artificiale per automatizzare i processi aziendali.',
        tech: ['OpenAI', 'Python', 'TensorFlow'],
        metrics: 'Smart Operations · Scalable',
        color: 0xec4899
      }
];
