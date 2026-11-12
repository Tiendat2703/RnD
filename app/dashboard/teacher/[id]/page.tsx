import { TeacherRoom } from '../../../../components/dashboard/TeacherRoom';

export default async function TeacherRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TeacherRoom id={id} />;
}
