
import React, { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any>;

type Result = {
    id: string;
    date: string;
    week: string;
    title: string;
    value: string;
    status: 'Bình thường' | 'Cần theo dõi';
    description: string;
};

const results: Result[] = [
    {
        id: '1',
        date: '15/05/2026',
        week: 'Tuần 24',
        title: 'Nghiệm pháp dung nạp Glucose',
        value: 'Đường huyết 1h: 7.2 mmol/L',
        status: 'Bình thường',
        description:
            'Chỉ số glucose trong máu ổn định sau khi dung nạp đường. Không phát hiện dấu hiệu đái tháo đường thai kỳ.',
    },
    {
        id: '2',
        date: '15/05/2026',
        week: 'Tuần 24',
        title: 'Siêu âm khảo sát hình thái',
        value: 'Cân nặng thai: 650g (bách phân vị 50)',
        status: 'Bình thường',
        description:
            'Cấu trúc não bộ, tim phổi, cơ quan nội tạng của bé phát triển hoàn toàn bình thường và cân đối.',
    },
    {
        id: '3',
        date: '01/04/2026',
        week: 'Tuần 18',
        title: 'Tổng phân tích nước tiểu',
        value: 'Protein: 0.15 g/L',
        status: 'Cần theo dõi',
        description:
            'Phát hiện vết protein trong nước tiểu nhẹ. Mẹ bầu cần uống nhiều nước và theo dõi thêm chỉ số huyết áp.',
    },
    {
        id: '4',
        date: '01/04/2026',
        week: 'Tuần 18',
        title: 'Xét nghiệm Double Test',
        value: 'Hội chứng Down: Nguy cơ thấp (1/10000)',
        status: 'Bình thường',
        description:
            'Chỉ số nguy cơ các bệnh nhiễm sắc thể thấp, thai nhi an toàn trong tầm soát quý I.',
    },
];

export default function HistoryResultsScreen({ navigation }: Props) {
    const [keyword, setKeyword] = useState('');
    const [filter, setFilter] = useState<'all' | 'normal' | 'follow'>('all');

    const filteredResults = useMemo(() => {
        return results.filter((item) => {
            const matchesKeyword =
                item.title.toLowerCase().includes(keyword.toLowerCase()) ||
                item.value.toLowerCase().includes(keyword.toLowerCase());

            const matchesFilter =
                filter === 'all' ||
                (filter === 'normal' && item.status === 'Bình thường') ||
                (filter === 'follow' && item.status === 'Cần theo dõi');

            return matchesKeyword && matchesFilter;
        });
    }, [keyword, filter]);

    const groupedResults = useMemo(() => {
        const groups: { date: string; week: string; items: Result[] }[] = [];

        filteredResults.forEach((item) => {
            let group = groups.find((g) => g.date === item.date);

            if (!group) {
                group = { date: item.date, week: item.week, items: [] };
                groups.push(group);
            }

            group.items.push(item);
        });

        return groups;
    }, [filteredResults]);

    const chooseFilter = () => {
        Alert.alert('Lọc kết quả', 'Chọn trạng thái kết quả', [
            { text: 'Tất cả', onPress: () => setFilter('all') },
            { text: 'Bình thường', onPress: () => setFilter('normal') },
            { text: 'Cần theo dõi', onPress: () => setFilter('follow') },
            { text: 'Hủy', style: 'cancel' },
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                    accessibilityLabel="Quay lại"
                    accessibilityRole="button"
                >
                    <Ionicons name="arrow-back" size={22} color="#334155" />
                </Pressable>

                <Text style={styles.headerTitle}>Lịch sử kết quả</Text>
            </View>

            <View style={styles.toolbar}>
                <Pressable style={styles.filterButton} onPress={chooseFilter}>
                    <Ionicons name="filter-outline" size={16} color="#008F83" />
                    <Text style={styles.toolbarText}>Lọc</Text>
                </Pressable>

                <View style={styles.searchBox}>
                    <Ionicons name="search-outline" size={17} color="#64748B" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm"
                        placeholderTextColor="#64748B"
                        value={keyword}
                        onChangeText={setKeyword}
                        returnKeyType="search"
                    />
                    {keyword.length > 0 && (
                        <Pressable onPress={() => setKeyword('')}>
                            <Ionicons name="close-circle" size={17} color="#64748B" />
                        </Pressable>
                    )}
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                {groupedResults.map((group) => (
                    <View key={group.date} style={styles.dateGroup}>
                        <View style={styles.dateHeading}>
                            <Ionicons name="calendar-outline" size={16} color="#009688" />
                            <Text style={styles.dateText}>
                                {group.date} ({group.week})
                            </Text>
                        </View>

                        {group.items.map((item) => (
                            <Pressable
                                key={item.id}
                                style={styles.resultCard}
                                onPress={() =>
                                    Alert.alert(
                                        item.title,
                                        `${item.value}\n\n${item.description}`
                                    )
                                }
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.resultTitle}>{item.title}</Text>

                                    <View
                                        style={[
                                            styles.statusBadge,
                                            item.status === 'Bình thường'
                                                ? styles.normalBadge
                                                : styles.followBadge,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                item.status === 'Bình thường'
                                                    ? styles.normalText
                                                    : styles.followText,
                                            ]}
                                        >
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.valueLabel}>Giá trị trích xuất:</Text>
                                <Text style={styles.resultValue}>{item.value}</Text>

                                {item.status === 'Cần theo dõi' && (
                                    <Pressable
                                        style={styles.doctorButton}
                                        onPress={() =>
                                            Alert.alert(
                                                'Liên hệ bác sĩ',
                                                'Chức năng nhắn tin bác sĩ sẽ được kết nối sau.'
                                            )
                                        }
                                    >
                                        <Ionicons
                                            name="chatbubble-ellipses-outline"
                                            size={15}
                                            color="#009688"
                                        />
                                        <Text style={styles.doctorButtonText}>
                                            Nhắn tin cho bác sĩ
                                        </Text>
                                    </Pressable>
                                )}

                                <View style={styles.descriptionBox}>
                                    <Text style={styles.description}>
                                        {item.description}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                ))}

                {filteredResults.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons
                            name="document-text-outline"
                            size={42}
                            color="#94A3B8"
                        />
                        <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
                        <Text style={styles.emptyDescription}>
                            Thử từ khóa khác hoặc thay đổi bộ lọc.
                        </Text>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Tuyên bố giới hạn trách nhiệm
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    header: {
        height: 54,
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5EAF0',
    },

    backButton: {
        position: 'absolute',
        left: 16,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#172B4D',
        textAlign: 'center',
    },
    moreButton: {
        width: 30,
        alignItems: 'flex-end',
    },
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    filterButton: {
        height: 34,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E7EF',
        borderRadius: 9,
    },
    toolbarText: {
        fontSize: 12,
        color: '#334155',
    },
    searchBox: {
        flex: 1,
        height: 34,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 9,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E7EF',
        borderRadius: 9,
    },
    searchInput: {
        flex: 1,
        padding: 0,
        fontSize: 12,
        color: '#334155',
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    dateGroup: {
        marginBottom: 4,
    },
    dateHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
        marginBottom: 7,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#008F83',
    },
    resultCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2EAF2',
        borderRadius: 13,
        padding: 10,
        marginBottom: 9,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 7,
    },
    resultTitle: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '700',
        color: '#1E293B',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 7,
    },
    normalBadge: {
        backgroundColor: '#CCFBF1',
    },
    followBadge: {
        backgroundColor: '#FEF3C7',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    normalText: {
        color: '#008F83',
    },
    followText: {
        color: '#A16207',
    },
    valueLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 6,
    },
    resultValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#008F83',
        marginTop: 3,
        marginBottom: 8,
    },
    descriptionBox: {
        backgroundColor: '#F5F8FC',
        borderRadius: 8,
        padding: 9,
    },
    description: {
        fontSize: 10,
        lineHeight: 15,
        color: '#64748B',
    },
    doctorButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#CCFBF1',
        borderRadius: 7,
        paddingHorizontal: 9,
        paddingVertical: 7,
        marginBottom: 8,
    },
    doctorButtonText: {
        color: '#009688',
        fontSize: 11,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
    },
    emptyDescription: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    footer: {
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E5EAF0',
    },
    footerText: {
        fontSize: 10,
        color: '#64748B',
    },
});
