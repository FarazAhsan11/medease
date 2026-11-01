import { Container } from "@/components/layout/container";
import { PageSkeleton } from "@/components/shared/page-skeleton";

export default function Loading() {
  return (
    <Container className="py-8">
      <PageSkeleton variant="cards" />
    </Container>
  );
}
