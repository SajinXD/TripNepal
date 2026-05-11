import React from "react";
import { Image, ImageSourcePropType, View } from "react-native";
import { cn } from "./Button";

type Status = "online" | "busy" | "offline" | "none";

interface AvatarProps {
	src?: string | ImageSourcePropType;
	size?: number;
	status?: Status;
	className?: string;
	borderMint?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
	online: "#22C55E",
	busy: "#F97316",
	offline: "#9CA3AF",
};

export function Avatar({
	src,
	size = 36,
	status = "none",
	className,
	borderMint,
}: AvatarProps) {
	const source =
		typeof src === "string"
			? { uri: src }
			: (src as ImageSourcePropType | undefined) ?? {
					uri: "https://placehold.co/400",
				};

	return (
		<View className={cn("relative", className)}>
			<Image
				source={source}
				style={{
					width: size,
					height: size,
					borderRadius: size / 2,
					...(borderMint && { borderWidth: 3, borderColor: "#A5D0B9" }),
				}}
			/>
			{status !== "none" && (
				<View
					style={{
						position: "absolute",
						bottom: 0,
						right: 0,
						width: 12,
						height: 12,
						borderRadius: 6,
						borderWidth: 2,
						borderColor: "#fff",
						backgroundColor: STATUS_COLORS[status],
					}}
				/>
			)}
		</View>
	);
}
