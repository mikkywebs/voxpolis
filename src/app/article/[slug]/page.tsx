import { permanentRedirect } from 'next/navigation';

interface Props {
  params: {
    slug: string;
  };
}

export default function LegacyArticleRedirectPage({ params }: Props) {
  permanentRedirect(`/news/${params.slug}`);
}
