type Props = {
  type?: "error" | "success"
  message: string
}

export default function FormMessage({ type = "error", message }: Props) {
  const baseStyle =
    "rounded-lg p-3 text-sm font-medium mt-2 transition-all duration-200"

  const styles =
    type === "error"
      ? "bg-red-50 text-red-700 border border-red-200"
      : "bg-green-50 text-green-700 border border-green-200"

  return <div className={`${baseStyle} ${styles}`}>{message}</div>
}