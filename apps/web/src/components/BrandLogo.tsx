type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export default function BrandLogo({ className = '', alt = 'Unitik logo' }: BrandLogoProps) {
  return <img src="/logo-unitik.png" alt={alt} className={className} />;
}
