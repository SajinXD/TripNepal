import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Check, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, cn } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { Input } from "../../src/components/ui/Input";
import { SegmentedControl } from "../../src/components/ui/SegmentedControl";
import { supabase } from "../../src/lib/supabase";

export default function LoginScreen() {
	const router = useRouter();
	const [roleIndex, setRoleIndex] = useState(0); // 0 = Customer, 1 = Guide
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [keepSignedIn, setKeepSignedIn] = useState(true);

	const handleLogin = async () => {
		if (!email || !password) {
			setError("Please enter both email and password");
			return;
		}

		setLoading(true);
		setError("");

		try {
			const { data, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: email.trim().toLowerCase(),
					password,
				});

			if (signInError) throw signInError;

			// Only check role mismatch — navigation is handled by _layout.tsx
			const { data: profileData } = await supabase
				.from("profiles")
				.select("role")
				.eq("id", data.user.id)
				.single();

			const expectedRole = roleIndex === 0 ? "tourist" : "guide";
			const actualRole = (profileData as any)?.role;

			if (actualRole && actualRole !== expectedRole) {
				await supabase.auth.signOut();
				setError(
					`This account is a ${actualRole} account. Please select "${actualRole === "guide" ? "Guide" : "Customer"}" above.`,
				);
				setLoading(false);
				return;
			}
			// _layout.tsx will detect user+profile and navigate automatically
		} catch (err: any) {
			const msg: string = err.message || "";
			if (msg.toLowerCase().includes("email not confirmed")) {
				setError(
					"Please confirm your email first. Check your inbox for a confirmation link from Supabase.",
				);
			} else if (
				msg.toLowerCase().includes("invalid login") ||
				msg.toLowerCase().includes("invalid credentials")
			) {
				setError("Incorrect email or password. Please try again.");
			} else {
				setError(msg || "Login failed. Please try again.");
			}
			setLoading(false);
		}
	};

	return (
		<View
			style={[
				styles.container,
				{ paddingTop: insets.top, paddingBottom: insets.bottom },
			]}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				className="flex-1"
			>
				<LinearGradient
					colors={["#E1F0FF", "#F3F4F5"]}
					style={{
						flex: 1,
						justifyContent: "center",
						alignItems: "center",
						paddingHorizontal: 16,
					}}
				>
					<Card
						className="w-[85%] max-w-[400px] p-8 !shadow-2xl"
						style={{
							shadowColor: "#8B1A1A",
							shadowOpacity: 0.1,
							shadowRadius: 24,
							elevation: 10,
						}}
					>
						<Text className="font-displayBold text-2xl text-primary mb-2 text-center">
							Welcome Back
						</Text>
						<Text className="font-body text-sm text-on-surface-variant text-center mb-6">
							Continue your journey across the peaks.
						</Text>

						<View className="mb-5">
							<SegmentedControl
								options={["Customer", "Guide"]}
								selectedIndex={roleIndex}
								onChange={setRoleIndex}
							/>
						</View>

						<View className="mb-4">
							<View className="mb-2">
								<Text className="text-on-surface font-bodySemibold text-sm">
									Email
								</Text>
								<Input
									placeholder="Email address"
									value={email}
									onChangeText={setEmail}
									keyboardType="email-address"
									autoCapitalize="none"
									leftIcon={
										<Mail size={20} color="#717973" />
									}
								/>
							</View>
							<View>
								<View className="flex-row justify-between items-center mb-2">
									<Text className="text-on-surface font-bodySemibold text-sm">
										Password
									</Text>
									<Pressable>
										<Text className="text-secondary font-bodySemibold text-sm">
											Forgot?
										</Text>
									</Pressable>
								</View>
								<Input
									placeholder="Password"
									value={password}
									onChangeText={setPassword}
									isPassword
									leftIcon={
										<Lock size={20} color="#717973" />
									}
								/>
							</View>
						</View>

						{error ? (
							<Text className="text-error font-body text-sm mb-4 mt-1">
								{error}
							</Text>
						) : (
							<View className="h-2" />
						)}

						<Pressable
							className="flex-row items-center mb-6"
							onPress={() => setKeepSignedIn(!keepSignedIn)}
						>
							<View
								className={cn(
									"w-[18px] h-[18px] border items-center justify-center rounded-[4px] mr-2",
									keepSignedIn
										? "bg-secondary border-secondary"
										: "border-outline-variant",
								)}
							>
								{keepSignedIn && (
									<Check size={12} color="#FFF" />
								)}
							</View>
							<Text className="text-on-surface font-body text-sm">
								Keep me signed in
							</Text>
						</Pressable>

						<Button
							variant="primary"
							onPress={handleLogin}
							loading={loading}
							className="mb-6 h-[48px]"
							textClassName="text-[16px] font-displaySemiBold"
						>
							Log In
						</Button>

						<View className="flex-row items-center mb-5">
							<View className="flex-1 h-[1px] bg-outline-variant" />
							<Text className="mx-4 text-outline font-bodyBold text-[12px] uppercase tracking-wider">
								OR CONTINUE WITH
							</Text>
							<View className="flex-1 h-[1px] bg-outline-variant" />
						</View>

						<View className="flex-row justify-between mb-6">
							<Button
								variant="secondary"
								className="flex-1 mr-2 bg-white"
								textClassName="text-on-surface"
							>
								Google
							</Button>
							<Button
								variant="secondary"
								className="flex-1 ml-2 bg-white"
								textClassName="text-on-surface"
							>
								Apple
							</Button>
						</View>

						<Pressable
							className="items-center"
							onPress={() => router.push("/(auth)/signup")}
						>
							<Text className="font-body text-on-surface-variant text-sm">
								New to the mountains?{" "}
								<Text className="text-primary font-bodyBold">
									Start your registration
								</Text>
							</Text>
						</Pressable>
					</Card>
				</LinearGradient>
			</KeyboardAvoidingView>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	container: { flex: 1, backgroundColor: "#F7F7F4" },
	scroll: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 40,
		paddingBottom: 40,
	},
	title: {
		fontSize: 32,
		fontWeight: "700",
		color: "#0A0A0A",
		marginBottom: 8,
	},
	subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 32 },
	sectionLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#0A0A0A",
		marginBottom: 12,
	},
	roleContainer: { flexDirection: "row", gap: 12, marginBottom: 32 },
	roleButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
		borderRadius: 12,
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E7EB",
	},
	roleButtonActive: {
		borderColor: "#8B1A1A",
		backgroundColor: "rgba(27, 77, 62, 0.05)",
	},
	roleText: { marginLeft: 8, fontWeight: "600", color: "#6B7280" },
	roleTextActive: { color: "#8B1A1A" },
	label: {
		fontSize: 14,
		fontWeight: "600",
		color: "#0A0A0A",
		marginBottom: 8,
	},
	inputRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#FFFFFF",
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 12,
		paddingHorizontal: 16,
		marginBottom: 16,
	},
	input: {
		flex: 1,
		paddingVertical: 16,
		paddingLeft: 12,
		fontSize: 16,
		color: "#0A0A0A",
	},
	button: {
		marginTop: 24,
		backgroundColor: "#8B1A1A",
		borderRadius: 16,
		paddingVertical: 18,
		alignItems: "center",
		marginBottom: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	},
	buttonDisabled: { opacity: 0.6 },
	buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
	footerRow: { flexDirection: "row", justifyContent: "center" },
	footerText: { fontSize: 14, color: "#6B7280" },
	link: { fontSize: 14, color: "#8B1A1A", fontWeight: "700" },
});
