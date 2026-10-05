/**
 * Persian labels for measurement keys that arrive without a human label —
 * chart columns built straight from `size_chart.values`, or reasoning keys in
 * the size-recommendation response. Shared by the size guide table and the
 * recommendation wizard so both name the same measurement the same way.
 */
const labels: Record<string, string> = {
  chest: "دور سینه",
  bust: "دور سینه",
  waist: "دور کمر",
  hip: "دور باسن",
  hips: "دور باسن",
  shoulder: "عرض شانه",
  shoulder_width: "عرض شانه",
  sleeve: "قد آستین",
  sleeve_length: "قد آستین",
  inseam: "قد داخلی پا",
  height: "قد",
  weight: "وزن",
  length: "قد لباس",
};

export function sizingLabelForKey(key: string): string {
  return labels[key.toLowerCase()] || "اندازه مرتبط";
}
