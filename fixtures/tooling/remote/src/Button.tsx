export interface ButtonProps {
	label: string
	onPress?: () => void
}

export default function Button({ label, onPress }: ButtonProps) {
	return (
		<button type="button" onClick={onPress}>
			{label}
		</button>
	)
}
