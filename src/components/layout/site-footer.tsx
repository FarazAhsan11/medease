import { Container } from "@/components/layout/container";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <Container className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
        reserved.
      </Container>
    </footer>
  );
}
