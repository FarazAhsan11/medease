type EmptyAppointmentsProps = {
  message: string;
};

export function EmptyAppointments({ message }: EmptyAppointmentsProps) {
  return <p className="text-ink-muted">{message}</p>;
}
