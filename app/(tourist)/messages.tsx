import { Avatar } from "@/components/ui/Avatar";
import { useRouter } from "expo-router";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../src/components/layout/ScreenHeader";
import { useAuth } from "../../src/hooks/useAuth";
import { supabase } from "../../src/lib/supabase";

export default function MessagesScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { user } = useAuth();

	const [threads, setThreads] = useState<any[]>([]);
	const [chatRequests, setChatRequests] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const loadData = useCallback(async () => {
		if (!user) return;
		try {
			const { data: tData } = await (supabase.from("chat_threads") as any)
				.select(
					"*, guide:profiles!guide_id(full_name, avatar_url), tourist:profiles!tourist_id(full_name, avatar_url)",
				)
				.eq("tourist_id", user.id)
				.order("last_message_at", { ascending: false });
			setThreads(tData || []);

			const { data: rData } = await (
				supabase.from("chat_requests") as any
			)
				.select("*, guide:profiles!guide_id(full_name)")
				.eq("tourist_id", user.id)
				.order("created_at", { ascending: false });
			setChatRequests(rData || []);
		} catch (e) {
			console.warn("Messages load error", e);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [user]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	useEffect(() => {
		if (!user) return;
		const threadsChannel = supabase
			.channel(`tourist_threads_${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "chat_threads",
					filter: `tourist_id=eq.${user.id}`,
				},
				() => loadData(),
			)
			.subscribe();

		const requestsChannel = supabase
			.channel(`tourist_requests_${user.id}`)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "chat_requests",
					filter: `tourist_id=eq.${user.id}`,
				},
				() => loadData(),
			)
			.subscribe();

		return () => {
			supabase.removeChannel(threadsChannel);
			supabase.removeChannel(requestsChannel);
		};
	}, [user, loadData]);

	async function cancelRequest(reqId: string) {
		Alert.alert("Cancel Request", "Cancel this connect request?", [
			{ text: "Keep", style: "cancel" },
			{
				text: "Cancel Request",
				style: "destructive",
				onPress: async () => {
					await (supabase.from("chat_requests") as any)
						.delete()
						.eq("id", reqId);
					loadData();
				},
			},
		]);
	}

	async function openChatFromRequest(req: any) {
		const { data: thread } = await (supabase.from("chat_threads") as any)
			.select("id")
			.eq("tourist_id", user!.id)
			.eq("guide_id", req.guide_id)
			.maybeSingle();
		if (thread) {
			router.push(`/chat/${thread.id}` as any);
		} else {
			Alert.alert(
				"Chat not ready",
				"The chat thread is not available yet.",
			);
		}
	}

	return (
		<View className="flex-1 bg-surface dark:bg-gray-900">
			<View style={{ paddingTop: insets.top }}>
				<ScreenHeader />
			</View>

			<View className="px-5 pt-5 pb-3">
				<Text className="font-displayBold text-[24px] text-on-surface">
					Messages
				</Text>
				<Text className="font-body text-[14px] text-on-surface-variant mt-1">
					Your conversations with guides
				</Text>
			</View>

			{loading ? (
				<View className="flex-1 items-center justify-center">
					<ActivityIndicator size="large" color="#8B1A1A" />
				</View>
			) : (
				<ScrollView
					className="flex-1"
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={() => {
								setRefreshing(true);
								loadData();
							}}
							tintColor="#8B1A1A"
						/>
					}
				>
					{/* Connect Requests */}
					{chatRequests.length > 0 && (
						<View className="px-5 pt-2 mb-2">
							<Text className="font-displaySemiBold text-[15px] text-on-surface mb-3">
								Connect Requests
							</Text>
							{chatRequests.map((req) => {
								const guideName =
									(req.guide as any)?.full_name || "Guide";
								const isPending = req.status === "pending";
								const isAccepted = req.status === "accepted";
								const isRejected = req.status === "rejected";
								return (
									<View
										key={req.id}
										className="flex-row items-center bg-white rounded-[16px] border border-outline-variant p-4 mb-3"
										style={{
											shadowColor: "#000",
											shadowOpacity: 0.04,
											shadowRadius: 4,
										}}
									>
										<View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
											<Text className="font-bold text-primary">
												{guideName[0].toUpperCase()}
											</Text>
										</View>
										<View className="flex-1">
											<Text className="font-displaySemiBold text-[14px] text-on-surface">
												{guideName}
											</Text>
											<View className="flex-row items-center mt-0.5">
												{isPending && (
													<Clock
														size={12}
														color="#D97706"
													/>
												)}
												{isAccepted && (
													<CheckCircle
														size={12}
														color="#059669"
													/>
												)}
												{isRejected && (
													<XCircle
														size={12}
														color="#DC2626"
													/>
												)}
												<Text
													className={`text-[11px] ml-1 font-medium ${isPending ? "text-amber-600" : isAccepted ? "text-green-600" : "text-red-600"}`}
												>
													{isPending
														? "Pending"
														: isAccepted
															? "Accepted"
															: "Declined"}
												</Text>
											</View>
										</View>
										{isPending && (
											<TouchableOpacity
												onPress={() =>
													cancelRequest(req.id)
												}
												className="border border-outline-variant rounded-lg px-3 py-1.5"
											>
												<Text className="text-xs text-on-surface-variant font-medium">
													Cancel
												</Text>
											</TouchableOpacity>
										)}
										{isAccepted && (
											<TouchableOpacity
												onPress={() =>
													openChatFromRequest(req)
												}
												className="bg-primary rounded-lg px-3 py-1.5"
											>
												<Text className="text-xs text-white font-medium">
													Open Chat
												</Text>
											</TouchableOpacity>
										)}
									</View>
								);
							})}
						</View>
					)}

					{threads.length === 0 && chatRequests.length === 0 ? (
						<View className="items-center py-20 px-8">
							<View className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
								<MessageSquare size={36} color="#8B1A1A" />
							</View>
							<Text className="font-displaySemiBold text-[18px] text-on-surface mb-2">
								No messages yet
							</Text>
							<Text className="font-body text-[14px] text-on-surface-variant text-center">
								Find a guide and send them a connect request to
								start chatting.
							</Text>
						</View>
					) : threads.length > 0 ? (
						<View className="px-5 pt-2">
							{chatRequests.length > 0 && (
								<Text className="font-displaySemiBold text-[15px] text-on-surface mb-3">
									Chats
								</Text>
							)}
							{threads.map((thread) => {
								const guide = thread.guide as any;
								const guideName = guide?.full_name || "Guide";
								const guideInitial = guideName[0].toUpperCase();
								const lastMsgTime = new Date(
									thread.last_message_at,
								);
								const isToday =
									lastMsgTime.toDateString() ===
									new Date().toDateString();
								const timeStr = isToday
									? lastMsgTime.toLocaleTimeString([], {
											hour: "2-digit",
											minute: "2-digit",
										})
									: lastMsgTime.toLocaleDateString([], {
											month: "short",
											day: "numeric",
										});

								return (
									<Pressable
										key={thread.id}
										onPress={() =>
											router.push(
												`/chat/${thread.id}` as any,
											)
										}
										className="flex-row items-center bg-white rounded-[16px] border border-outline-variant p-4 mb-3"
										style={{
											shadowColor: "#000",
											shadowOpacity: 0.04,
											shadowRadius: 4,
										}}
									>
										{/* Avatar */}
										<View className="relative mr-3">
											<View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center">
												<Avatar
													size={48}
													src={guide?.avatar_url}
												/>
											</View>
											<View className="absolute bottom-0 right-0 w-3 h-3 bg-[#22C55E] rounded-full border-2 border-white" />
										</View>

										{/* Content */}
										<View className="flex-1">
											<View className="flex-row items-center justify-between mb-1">
												<Text className="font-displaySemiBold text-[15px] text-on-surface">
													{guideName}
												</Text>
												<Text className="font-body text-[11px] text-on-surface-variant">
													{timeStr}
												</Text>
											</View>
											<Text
												className="font-body text-[13px] text-on-surface-variant"
												numberOfLines={1}
											>
												Tap to continue your
												conversation
											</Text>
										</View>
									</Pressable>
								);
							})}
						</View>
					) : null}
					<View className="h-10" />
				</ScrollView>
			)}
		</View>
	);
}
