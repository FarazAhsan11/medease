import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export function Hero() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="flex flex-col items-center gap-6 text-center">
        <Badge variant="secondary">Coming soon</Badge>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Healthcare that fits around your life
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          {siteConfig.description}
        </p>
      </Container>
    </section>
  );
}
