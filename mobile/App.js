import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, ImageBackground, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl || 'https://fixit-salone-api.onrender.com').replace(/\/$/, '');
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false })
});
const GOOGLE_WEB_CLIENT_ID = String(Constants.expoConfig?.extra?.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
const COLORS = {
  navy: '#173B72',
  deepNavy: '#1769D2',
  orange: '#168BFA',
  orangeDark: '#1268C4',
  orangeLight: '#E8F2FF',
  green: '#159447',
  pale: '#FFFFFF',
  card: '#F7FAFF',
  ink: '#203047',
  muted: '#63738A',
  line: '#E1E9F3',
  white: '#FFFFFF',
  red: '#B42318',
  lightGreen: '#E8F7EE',
  amber: '#8A5200',
  softBlue: '#E8F2FF',
  warmPeach: '#FFF4DF',
  paleGreen: '#E8F7EE',
  lightPink: '#FEE2E2'
};
const HOME_CATEGORIES = [
  { label: 'Plumbing', symbol: '🔧', query: 'plumbing', tint: '#E8F4EE' },
  { label: 'Electrical', symbol: '💡', query: 'electrical', tint: '#FFF4DF' },
  { label: 'General Home', symbol: '🏠', query: 'home', tint: '#E8F4EE' },
  { label: 'Roofing', symbol: '🪜', query: 'roofing', tint: '#FFF4DF' },
  { label: 'Appliance Repair', symbol: '🧊', query: 'appliance repair', tint: '#F7FAF8' },
  { label: 'Emergency Services', symbol: '🚨', query: 'emergency', tint: '#FEE2E2' },
  { label: 'IT & Computer', symbol: '💻', query: 'computer', tint: '#E8F4EE' },
  { label: 'Cleaning', symbol: '🧹', query: 'cleaning', tint: '#E8F4EE' },
  { label: 'Carpentry', symbol: '🪚', query: 'carpentry', tint: '#FFF4DF' },
  { label: 'Painting', symbol: '🖌️', query: 'painting', tint: '#FEE2E2' },
  { label: 'Pest Control', symbol: '🪲', query: 'pest control', tint: '#E8F4EE' },
  { label: 'Moving & Delivery', symbol: '🚚', query: 'moving', tint: '#F7FAF8' },
  { label: 'Beauty & Grooming', symbol: '💇', query: 'beauty', tint: '#FEE2E2' },
  { label: 'AC & Refrigerator', symbol: '❄️', query: 'refrigerator', tint: '#E8F4EE' },
  { label: 'Generator Repair', symbol: '⚡', query: 'generator', tint: '#FFF4DF' },
  { label: 'CCTV & Security', symbol: '📹', query: 'cctv', tint: '#F7FAF8' },
  { label: 'Welding & Metal Work', symbol: '🧑‍🏭', query: 'welding', tint: '#FFF4DF' },
  { label: 'Solar & Inverter', symbol: '🔋', query: 'solar', tint: '#E8F4EE' },
  { label: 'Tiling & Masonry', symbol: '🧱', query: 'tiling', tint: '#F7FAF8' },
  { label: 'Auto Repair', symbol: '🚗', query: 'auto repair', tint: '#E8F4EE' },
  { label: 'Landscaping & Gardening', symbol: '🌿', query: 'landscaping', tint: '#E8F4EE' },
  { label: 'Water Tank & Well', symbol: '🚰', query: 'water tank', tint: '#E8F4EE' }
];
const HOME_HERO_ASSETS = {
  plumbing: require('./assets/hero-plumbing.jpg'),
  electrical: require('./assets/hero-electrical.jpg'),
  repairs: require('./assets/hero-repairs.jpg'),
  carpentry: require('./assets/hero-carpentry.jpg'),
  appliances: require('./assets/hero-appliances.jpg'),
  cooling: require('./assets/hero-cooling.jpg'),
  painting: require('./assets/hero-painting.jpg'),
  cleaning: require('./assets/hero-cleaning.jpg'),
  pest: require('./assets/hero-pest-control.jpg'),
  moving: require('./assets/hero-moving.jpg'),
  beauty: require('./assets/hero-beauty.jpg'),
  auto: require('./assets/hero-auto-repair.jpg'),
  landscaping: require('./assets/hero-landscaping.jpg'),
  computer: require('./assets/hero-it-computer.jpg')
};
const HOME_HERO_IMAGE_BY_CATEGORY = {
  Plumbing: 'plumbing',
  Electrical: 'electrical',
  'General Home': 'repairs',
  Roofing: 'carpentry',
  'Appliance Repair': 'appliances',
  'Emergency Services': 'repairs',
  'IT & Computer': 'computer',
  Cleaning: 'cleaning',
  Carpentry: 'carpentry',
  Painting: 'painting',
  'Pest Control': 'pest',
  'Moving & Delivery': 'moving',
  'Beauty & Grooming': 'beauty',
  'AC & Refrigerator': 'cooling',
  'Generator Repair': 'appliances',
  'CCTV & Security': 'electrical',
  'Welding & Metal Work': 'auto',
  'Solar & Inverter': 'electrical',
  'Tiling & Masonry': 'repairs',
  'Auto Repair': 'auto',
  'Landscaping & Gardening': 'landscaping',
  'Water Tank & Well': 'plumbing'
};
const HOME_HERO_SLIDES = HOME_CATEGORIES.map((category, index) => ({
  ...category,
  image: HOME_HERO_ASSETS[HOME_HERO_IMAGE_BY_CATEGORY[category.label]] || HOME_HERO_ASSETS.repairs,
  ordinal: index + 1
}));
const CUSTOMER_QUICK_CATEGORIES = [
  { label: 'Plumbing', symbol: '🚰', query: 'plumbing', tint: '#E7F5EF' },
  { label: 'Electrical', symbol: 'ϟ', query: 'electrical', tint: '#FFF4D9' },
  { label: 'Carpentry', symbol: '🔨', query: 'carpentry', tint: '#F5EFE4' },
  { label: 'Painting', symbol: '🖌️', query: 'painting', tint: '#E8F3EC' },
  { label: 'Repairs', symbol: '🛠️', query: 'repair', tint: '#E7F1FA' },
  { label: 'Cleaning', symbol: '🧹', query: 'cleaning', tint: '#F0EBFA' },
  { label: 'AC & Cooling', symbol: '❄️', query: 'AC', tint: '#E7F1FA' },
  { label: 'More', symbol: '•••', query: '', tint: '#F1F4F2' }
];
const CATEGORY_PAGE_SIZE = 8;
const CATEGORY_PAGES = Array.from(
  { length: Math.ceil(HOME_CATEGORIES.length / CATEGORY_PAGE_SIZE) },
  (_, page) => HOME_CATEGORIES.slice(page * CATEGORY_PAGE_SIZE, (page + 1) * CATEGORY_PAGE_SIZE)
);
const REGIONS = ['Western Area', 'Eastern', 'Northern', 'North West', 'Southern'];
const DISTRICTS = {
  'Western Area': ['Western Area Urban', 'Western Area Rural'],
  Eastern: ['Kailahun', 'Kenema', 'Kono'],
  Northern: ['Bombali', 'Falaba', 'Koinadugu', 'Tonkolili'],
  'North West': ['Kambia', 'Karene', 'Port Loko'],
  Southern: ['Bo', 'Bonthe', 'Moyamba', 'Pujehun']
};

function mediaUri(path) {
  const value = String(path || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return API_BASE + (value.startsWith('/') ? value : '/' + value);
}

function RemoteImage({ uri, style, fallbackText = 'Photo unavailable', resizeMode = 'cover' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);
  const resolved = mediaUri(uri);
  if (!resolved || failed) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Text style={styles.imagePlaceholderText}>{fallbackText}</Text>
      </View>
    );
  }
  return <Image source={{ uri: resolved }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />;
}

function AuthenticatedRequestImage({ uri, token, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [uri]);
  const resolved = mediaUri(uri);
  if (!resolved || failed) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Text style={styles.imagePlaceholderText}>Photo could not be loaded</Text>
      </View>
    );
  }
  const raw = String(uri || '');
  const needsAuthHeader = raw.startsWith('/api/service-requests/') || raw.startsWith('/api/customer/profile-photo/file');
  const source = needsAuthHeader && token
    ? { uri: resolved, headers: { Authorization: 'Bearer ' + token } }
    : { uri: resolved };
  return <Image source={source} style={style} resizeMode="cover" onError={() => setFailed(true)} />;
}

function Button({ title, onPress, secondary = false, disabled = false, compact = false, tone = 'brand' }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.button, tone === 'green' && styles.buttonGreen, secondary && styles.buttonSecondary, compact && styles.buttonCompact, disabled && styles.disabled, pressed && !disabled && styles.buttonPressed]}>
      <Text style={[styles.buttonText, tone === 'green' && styles.buttonGreenText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}
function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false, editable = true }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#98A2B3"
        secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
        multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} editable={editable}
        style={[styles.input, multiline && styles.textArea, !editable && { backgroundColor: '#F3F6F8' }]} />
    </View>
  );
}
function getWorkProgress(status) {
  const progressByStatus = { requested: 20, quoted: 40, approved: 60, in_progress: 82, completed: 100 };
  return progressByStatus[String(status || 'requested').toLowerCase()] || 12;
}

function getWorkStage(status) {
  const labels = {
    requested: 'Request sent',
    quoted: 'Quote received',
    approved: 'Quote approved',
    in_progress: 'Work in progress',
    completed: 'Completed',
    declined: 'Declined',
    cancelled: 'Cancelled'
  };
  return labels[String(status || 'requested').toLowerCase()] || String(status || 'Requested').replaceAll('_', ' ');
}

function getWorkIcon(serviceName) {
  const name = String(serviceName || '').toLowerCase();
  if (/electric|light|fan|wiring/.test(name)) return '💡';
  if (/plumb|pipe|sink|tap|toilet/.test(name)) return '🔧';
  if (/roof|ceiling/.test(name)) return '🪜';
  if (/computer|it support|software|network/.test(name)) return '💻';
  if (/appliance|fridge|refrigerator|washing/.test(name)) return '🧊';
  if (/paint/.test(name)) return '🖌️';
  if (/clean/.test(name)) return '🧹';
  return '🛠️';
}

function ActiveWorkCard({ job, role, onPress, fullWidth = false }) {
  const progress = getWorkProgress(job.status);
  const isCustomer = role === 'customer';
  const partner = isCustomer
    ? (job.business_name || job.provider_name || 'Waiting for provider')
    : (job.customer_name || 'Customer');
  const area = [job.area, job.district].filter(Boolean).join(', ');
  const date = job.created_at ? new Date(job.created_at).toLocaleDateString() : '';

  return (
    <View style={[styles.activeJobCard, fullWidth && styles.activeJobCardFullWidth]}>
      <View style={styles.activeJobTop}>
        <View style={styles.jobIllustration}>
          <Text style={styles.jobIllustrationText}>{getWorkIcon(job.service_name)}</Text>
        </View>
        <View style={styles.activeJobSummary}>
          <Text numberOfLines={2} style={styles.activeJobTitle}>{job.service_name || 'Service request'}</Text>
          <Text style={styles.activeJobStatus}>Status: <Text style={styles.activeJobStatusValue}>{getWorkStage(job.status)}</Text></Text>
          <Text numberOfLines={1} style={styles.activeJobProvider}>{isCustomer ? 'Technician: ' : 'Customer: '}{partner}</Text>
          {!!area && <Text numberOfLines={1} style={styles.activeJobMeta}>{area}</Text>}
        </View>
      </View>
      <View style={styles.activeJobProgressHeading}>
        <Text style={styles.activeJobProgressLabel}>Job progress</Text>
        <Text style={styles.activeJobProgressStage}>{progress >= 82 ? (progress === 100 ? 'Completed' : 'In progress') : progress >= 60 ? 'Approved' : progress >= 40 ? 'Quoted' : 'Requested'}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress + '%' }]} />
      </View>
      <View style={styles.activeJobFooter}>
        <Text numberOfLines={1} style={styles.activeJobDate}>{date ? 'Requested ' + date : 'Service request'}</Text>
        <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.jobDetailButton, pressed && styles.buttonPressed]}>
          <Text style={styles.jobDetailButtonText}>View details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProviderRequestCard({ job, onPress }) {
  const location = [job.area, job.district, job.region].filter(Boolean).join(', ');
  const createdAt = job.created_at ? new Date(job.created_at) : null;
  const requestedDate = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <View style={styles.providerRequestCard}>
      <View style={styles.providerRequestTop}>
        <View style={styles.providerRequestIcon}>
          <Text style={styles.providerRequestIconText}>{getWorkIcon(job.service_name)}</Text>
        </View>
        <View style={styles.providerRequestCopy}>
          <Text numberOfLines={1} style={styles.providerRequestService}>{job.service_name || 'Service request'}</Text>
          <View style={styles.providerRequestBadge}>
            <Text style={styles.providerRequestBadgeText}>New request</Text>
          </View>
          <Text numberOfLines={2} style={styles.providerRequestCustomer}>Customer: {job.customer_name || 'Customer'}</Text>
          {!!location && <Text numberOfLines={2} style={styles.providerRequestLocation}>⌖  {location}</Text>}
        </View>
      </View>
      {!!requestedDate && (
        <View style={styles.providerRequestDateRow}>
          <Text style={styles.providerRequestDateIcon}>▦</Text>
          <Text style={styles.providerRequestDate}>Requested: {requestedDate}</Text>
        </View>
      )}
      <Pressable accessibilityRole="button"
        accessibilityLabel={'View request details for ' + (job.service_name || 'service request')}
        onPress={onPress}
        style={({ pressed }) => [styles.providerDashboardButton, pressed && styles.buttonPressed]}>
        <Text style={styles.providerDashboardButtonText}>View details  →</Text>
      </Pressable>
    </View>
  );
}

function ProviderDashboardButton({ title, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.providerDashboardButton, pressed && styles.buttonPressed]}>
      <Text style={styles.providerDashboardButtonText}>{title}</Text>
    </Pressable>
  );
}
function JobProgressDetails({ status }) {
  const currentStatus = String(status || 'requested').toLowerCase();
  const stages = [
    { key: 'requested', label: 'Requested' },
    { key: 'quoted', label: 'Quoted' },
    { key: 'approved', label: 'Approved' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'completed', label: 'Completed' }
  ];
  const indexByStatus = { requested: 0, quoted: 1, approved: 2, in_progress: 3, completed: 4 };
  if (['cancelled', 'declined'].includes(currentStatus)) {
    return (
      <View style={styles.progressTerminal}>
        <Text style={styles.progressTerminalLabel}>{currentStatus === 'cancelled' ? 'This request was cancelled.' : 'This request was declined.'}</Text>
      </View>
    );
  }
  const currentIndex = indexByStatus[currentStatus] ?? 0;
  const progress = getWorkProgress(currentStatus);
  return (
    <View style={styles.requestProgressWrap}>
      <View style={styles.requestProgressHeading}>
        <Text style={styles.requestProgressTitle}>Job progress</Text>
        <Text style={styles.requestProgressValue}>{getWorkStage(currentStatus)}</Text>
      </View>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progress + '%' }]} />
      </View>
      <View style={styles.requestProgressStages}>
        {stages.map((stage, index) => (
          <View key={stage.key} style={styles.requestProgressStage}>
            <View style={[styles.requestProgressDot, index <= currentIndex && styles.requestProgressDotDone, index === currentIndex && styles.requestProgressDotCurrent]} />
            <Text numberOfLines={2} style={[styles.requestProgressStageLabel, index <= currentIndex && styles.requestProgressStageLabelDone]}>{stage.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AuthRoleChoice({ active, icon, title, subtitle, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={({ pressed }) => [styles.authRoleChoice, active && styles.authRoleChoiceActive, pressed && styles.authRolePressed]}>
      {icon === 'customer' ? <View style={styles.authPeopleIcon}>
        <View style={styles.authPeopleHeads}><View style={[styles.authPersonHead, active && styles.authPersonActive]} /><View style={[styles.authPersonHead, active && styles.authPersonActive]} /></View>
        <View style={styles.authPeopleBodies}><View style={[styles.authPersonBody, active && styles.authPersonActive]} /><View style={[styles.authPersonBody, active && styles.authPersonActive]} /></View>
      </View> : <View style={styles.authHardHat}><View style={[styles.authHardHatDome, active && styles.authPersonActive]} /><View style={[styles.authHardHatStripe, active && styles.authHardHatStripeActive]} /><View style={[styles.authHardHatBrim, active && styles.authPersonActive]} /></View>}
      <View style={styles.authRoleTextWrap}>
        <Text style={[styles.authRoleTitle, active && styles.authRoleTitleActive]}>{title}</Text>
        <Text style={[styles.authRoleSubtitle, active && styles.authRoleSubtitleActive]}>{subtitle}</Text>
      </View>
      <Text style={[styles.authRoleArrow, active && styles.authRoleArrowActive]}>›</Text>
    </Pressable>
  );
}
function BellGlyph() {
  return <View style={styles.bellGlyph}><View style={styles.bellDome} /><View style={styles.bellBase} /><View style={styles.bellClapper} /></View>;
}
function FilterGlyph() {
  return <View style={styles.filterGlyph}>
    <View style={styles.filterTrack}><View style={styles.filterKnobLeft} /></View>
    <View style={styles.filterTrack}><View style={styles.filterKnobRight} /></View>
    <View style={styles.filterTrack}><View style={styles.filterKnobCenter} /></View>
  </View>;
}
function ActionTile({ icon, title, subtitle, onPress, disabled = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.accountTile, pressed && styles.accountTilePressed, disabled && styles.disabled]}>
      <View style={styles.accountTileTop}>
        <View style={styles.accountTileIconWrap}><Text style={styles.accountTileIcon}>{icon}</Text></View>
        <Text style={styles.accountTileArrow}>↗</Text>
      </View>
      <Text style={styles.accountTileTitle}>{title}</Text>
      <Text style={styles.accountTileSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}
function Chip({ title, active = false, onPress }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{title}</Text></Pressable>;
}

function OptionPicker({ label, value, options, placeholder = 'Choose an option', onChange, disabled = false }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={label + ': ' + (value || placeholder)}
        disabled={disabled || options.length === 0}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.pickerTrigger, pressed && styles.pickerPressed, (disabled || options.length === 0) && styles.disabled]}>
        <Text style={[styles.pickerValue, !value && styles.pickerPlaceholder]}>{value || placeholder}</Text>
        <Text style={styles.pickerChevron}>⌄</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setVisible(false)} />
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Choose {label.toLowerCase()}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.pickerOptions}>
              {options.map(option => (
                <Pressable key={String(option)} onPress={() => { onChange(option); setVisible(false); }}
                  style={({ pressed }) => [styles.pickerOption, option === value && styles.pickerOptionSelected, pressed && styles.pickerPressed]}>
                  <Text style={[styles.pickerOptionText, option === value && styles.pickerOptionTextSelected]}>{option}</Text>
                  {option === value ? <Text style={styles.pickerCheck}>✓</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.pickerCancel} onPress={() => setVisible(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function Card({ children, style }) { return <View style={[styles.card, style]}>{children}</View>; }
function Status({ value }) {
  const label = String(value || 'unknown').replaceAll('_', ' ');
  return <View style={styles.status}><Text style={styles.statusText}>{label}</Text></View>;
}
function Empty({ text }) { return <Text style={styles.empty}>{text}</Text>; }

function SplashDot({ delay = 0 }) {
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.35, duration: 380, useNativeDriver: true }),
      Animated.delay(280)
    ]));
    animation.start();
    return () => animation.stop();
  }, [delay, opacity]);
  const scale = opacity.interpolate({ inputRange: [0.35, 1], outputRange: [0.86, 1.12] });
  return <Animated.View style={[styles.splashDot, { opacity, transform: [{ scale }] }]} />;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const splashProgress = useRef(new Animated.Value(0)).current;
  const [screen, setScreen] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [role, setRole] = useState('customer');
  const [token, setToken] = useState('');
  const [restoringSession, setRestoringSession] = useState(true);
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [pendingGoogleIdToken, setPendingGoogleIdToken] = useState('');
  const googleAuthConfigured = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [homepageSlideIndex, setHomepageSlideIndex] = useState(0);
  const activeHomeHeroSlide = HOME_HERO_SLIDES[homepageSlideIndex % HOME_HERO_SLIDES.length];
  const categoryCarouselRef = useRef(null);
  const [categoryCarouselWidth, setCategoryCarouselWidth] = useState(0);
  const [categoryPageIndex, setCategoryPageIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const [jobs, setJobs] = useState([]);
  const [jobMeta, setJobMeta] = useState({});
  const [payments, setPayments] = useState([]);
  const [providerProfile, setProviderProfile] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [professionSuggestions, setProfessionSuggestions] = useState([]);
  const [providerWorkItems, setProviderWorkItems] = useState([]);
  const [workAsset, setWorkAsset] = useState(null);
  const [workCaption, setWorkCaption] = useState('');
  const [workUploadBusy, setWorkUploadBusy] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pushToken, setPushToken] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [conversationRequestId, setConversationRequestId] = useState('');
  const [conversationMessages, setConversationMessages] = useState([]);
  const [conversationDraft, setConversationDraft] = useState('');
  const [conversationBusy, setConversationBusy] = useState(false);

  const [requestForm, setRequestForm] = useState({
    contactPhone: '', region: 'Western Area', district: 'Western Area Urban', area: '', address: '', directions: '', details: '', pricingType: 'quote_required'
  });
  const [editingRequest, setEditingRequest] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [pendingPhotoRequestId, setPendingPhotoRequestId] = useState('');
  const [jobPhotos, setJobPhotos] = useState([]);
  const [jobPhotosRequestId, setJobPhotosRequestId] = useState('');
  const [providerForm, setProviderForm] = useState({
    businessName: '', region: 'Western Area', district: 'Western Area Urban', area: '', address: '',
    serviceId: '', otherProfession: '', pricingType: 'starting_price', price: '', description: ''
  });
  const [quoteJobId, setQuoteJobId] = useState('');
  const [quoteForm, setQuoteForm] = useState({ labour: '', materials: '', transport: '' });
  const [receiptJobId, setReceiptJobId] = useState('');
  const [receiptAmount, setReceiptAmount] = useState('');
  const [receiptMethod, setReceiptMethod] = useState('Cash');
  const [receiptReference, setReceiptReference] = useState('');
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [reviewJobId, setReviewJobId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [verifyStatus, setVerifyStatus] = useState(null);
    const [identityDocumentAsset, setIdentityDocumentAsset] = useState(null);
  const [identitySelfieAsset, setIdentitySelfieAsset] = useState(null);
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [incidentReason, setIncidentReason] = useState('Fraud or scam');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [incidentReportedUserId, setIncidentReportedUserId] = useState('');
  const [incidentJobId, setIncidentJobId] = useState('');
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: 'Hello! I can help with general FixIt Salone questions. Please do not share passwords or verification codes.' }]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    const progressAnimation = Animated.timing(splashProgress, {
      toValue: 1,
      duration: 2700,
      useNativeDriver: false
    });
    progressAnimation.start();
    const timer = setTimeout(() => setShowSplash(false), 3200);
    return () => {
      progressAnimation.stop();
      clearTimeout(timer);
    };
  }, [splashProgress]);

  useEffect(() => {
    let active = true;
    async function recoverCameraResult() {
      try {
        // Android may destroy the app activity while the system camera is open.
        // Recover the captured image when Expo starts the app again.
        const result = await ImagePicker.getPendingResultAsync();
        if (!active || !result) return;
        if (result.code) {
          setError('The camera returned an error. Please try taking the photo again, or choose one from your gallery.');
          return;
        }
        if (!result.canceled && result.assets?.length) {
          addPickedPhotos(result.assets);
          setNotice('Your camera photo was recovered. Review it before sending your request.');
        }
      } catch {
        if (active) setError('We could not recover the camera photo. Please try again or choose a photo from your gallery.');
      }
    }
    recoverCameraResult();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function restoreSavedSession() {
      try {
        const savedToken = await SecureStore.getItemAsync('fixit-salone-session-token');
        if (!savedToken) return;
        const response = await expoFetch(API_BASE + '/api/auth/me', {
          headers: { Authorization: 'Bearer ' + savedToken }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.user) {
          await SecureStore.deleteItemAsync('fixit-salone-session-token').catch(() => {});
          return;
        }
        if (!active) return;
        setToken(savedToken);
        setUser(data.user);
        setRole(data.user.role);
        setScreen('home');
        await loadProfilePhoto(savedToken, data.user.role);
      } catch (e) {
        // Keep the sign-in screen available if the device is offline or the saved session cannot be checked.
      } finally {
        if (active) setRestoringSession(false);
      }
    }
    restoreSavedSession();
    return () => { active = false; };
  }, []);

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body && !(typeof FormData !== 'undefined' && options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await expoFetch(API_BASE + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to complete this request.');
    return data;
  }
  async function registerPushNotifications(requestPermission = false) {
    if (Platform.OS === 'web' || !Constants.isDevice) {
      if (requestPermission) setError('Push alerts require a physical Android or iOS device.');
      return null;
    }
    setPushBusy(true);
    try {
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted' && requestPermission) permission = await Notifications.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        if (requestPermission) setError('Allow FixIt Salone notifications in your device settings to receive job and message updates.');
        return null;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'FixIt updates', importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250], lightColor: '#159447'
        });
      }
      const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new Error('The EAS project ID is missing from app configuration.');
      const result = await Notifications.getExpoPushTokenAsync({ projectId });
      await api('/api/push-token', {
        method: 'POST', body: JSON.stringify({ token: result.data, platform: Platform.OS })
      });
      await SecureStore.deleteItemAsync('fixit-salone-push-disabled').catch(() => {});
      setPushToken(result.data);
      if (requestPermission) setNotice('Push alerts are enabled on this device.');
      return result.data;
    } catch (e) {
      if (requestPermission) reportError(e);
      return null;
    } finally { setPushBusy(false); }
  }
  async function disablePushNotifications() {
    if (!pushToken || pushBusy) return;
    setPushBusy(true);
    try {
      await api('/api/push-token', { method: 'DELETE', body: JSON.stringify({ token: pushToken }) });
      await SecureStore.setItemAsync('fixit-salone-push-disabled', 'true');
      setPushToken('');
      setNotice('Push alerts are disabled on this device.');
    } catch (e) { reportError(e); }
    finally { setPushBusy(false); }
  }
  function reportError(e) {
    const message = e?.message || 'Something went wrong. Please try again.';
    setError(message);
    setNotice('');
    return message;
  }
  function clearMessages() { setError(''); setNotice(''); }
  async function loadProfilePhoto(accessToken = token, accountRole = user?.role) {
    if (!accessToken || !['customer', 'provider'].includes(accountRole)) {
      setProfilePhotoUrl('');
      return null;
    }
    const endpoint = accountRole === 'provider' ? '/api/provider/profile-photo' : '/api/customer/profile-photo';
    try {
      const response = await expoFetch(API_BASE + endpoint, {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load profile photo.');
      const photoUrl = data.photo_url || data.authenticated_photo_url || '';
      setProfilePhotoUrl(photoUrl);
      return photoUrl || null;
    } catch (e) {
      setProfilePhotoUrl('');
      return null;
    }
  }
  async function pickProfilePhoto() {
    if (!['customer', 'provider'].includes(user?.role)) {
      setError('Profile photo upload is available for customer and provider accounts.');
      return;
    }
    if (profilePhotoBusy) return;
    clearMessages();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      let mimeType = String(asset.mimeType || 'image/jpeg').toLowerCase();
      if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        setError('Please choose a JPG, PNG or WEBP photo.');
        return;
      }
      if (asset.fileSize != null && asset.fileSize > 5 * 1024 * 1024) {
        setError('Please choose a photo smaller than 5 MB.');
        return;
      }
      const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
      const uploadName = 'fixit-profile-photo-' + Date.now() + '.' + extension;
      const uploadFile = new File(asset.uri);
      const form = new FormData();
      form.append('photo', uploadFile, uploadName);
      const photoEndpoint = user.role === 'provider' ? '/api/provider/profile-photo' : '/api/customer/profile-photo';
      setProfilePhotoBusy(true);
      const uploadResponse = await expoFetch(API_BASE + photoEndpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form
      });
      const data = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(data.error || 'Unable to upload profile photo.');
      const visiblePhotoUrl = await loadProfilePhoto(token, user.role);
      if (!visiblePhotoUrl) throw new Error('The upload finished, but the server could not return the saved photo. Please retry after the backend is redeployed.');
      setNotice(data.storage_persistent === false
        ? 'Profile photo uploaded. Note: permanent media storage is not configured yet, so the file could be lost if the server restarts.'
        : (data.message || 'Profile picture updated successfully.'));
    } catch (e) {
      reportError(e);
    } finally {
      setProfilePhotoBusy(false);
    }
  }
  function setProviderFormValue(key, value) { setProviderForm(prev => ({ ...prev, [key]: value })); }
  function setRequestValue(key, value) { setRequestForm(prev => ({ ...prev, [key]: value })); }
  function setQuoteValue(key, value) { setQuoteForm(prev => ({ ...prev, [key]: value })); }

  async function completeAuthSession(data, message) {
    if (!data?.token || !data?.user) throw new Error('The sign-in response was incomplete. Please try again.');
    await SecureStore.setItemAsync('fixit-salone-session-token', data.token);
    setToken(data.token);
    setUser(data.user);
    setRole(data.user.role);
    setScreen('home');
    setPassword('');
    setPendingGoogleIdToken('');
    await loadProfilePhoto(data.token, data.user.role);
    setNotice(message);
  }

  async function signInWithGoogle() {
    clearMessages();
    setBusy(true);
    try {
      if (Platform.OS === 'web') throw new Error('Google sign-in is currently set up for the Android and iPhone app.');
      if (!pendingGoogleIdToken && !GOOGLE_WEB_CLIENT_ID) {
        throw new Error('Google sign-in needs the Google Web Client ID added to the app configuration first.');
      }

      let idToken = pendingGoogleIdToken;
      let googleName = fullName.trim();
      if (!idToken) {
        let google;
        try { google = require('react-native-nitro-google-signin'); }
        catch (_) { throw new Error('Google sign-in needs the FixIt development build. Expo Go does not include the Google sign-in module.'); }
        const { GoogleOneTapSignIn, isNoSavedCredentialFoundResponse, isSuccessResponse } = google;
        if (!googleAuthConfigured.current) {
          GoogleOneTapSignIn.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
          googleAuthConfigured.current = true;
        }
        await GoogleOneTapSignIn.checkPlayServices();
        let response = await GoogleOneTapSignIn.signIn();
        if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.createAccount();
        if (isNoSavedCredentialFoundResponse(response)) response = await GoogleOneTapSignIn.presentExplicitSignIn();
        if (!isSuccessResponse(response)) return;
        idToken = String(response.data?.idToken || '');
        googleName = String(response.data?.user?.name || googleName).trim();
        if (!idToken) throw new Error('Google did not return a sign-in token. Check the Web Client ID configuration.');
      }

      const rawPhone = phone.trim().replace(/[\s()-]/g, '');
      const normalizedPhone = /^\+?232\d{8}$/.test(rawPhone) ? (rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone) : /^0\d{8}$/.test(rawPhone) ? '+232' + rawPhone.slice(1) : /^\d{8}$/.test(rawPhone) ? '+232' + rawPhone : rawPhone;
      setPendingGoogleIdToken(idToken);
      const data = await api('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          role,
          phone: normalizedPhone,
          password,
          full_name: googleName
        })
      });
      if (data.requiresPhone) {
        setPendingGoogleIdToken(idToken);
        setFullName(data.full_name || googleName);
        setAuthMode('register');
        setNotice('Add your Sierra Leone phone number to finish setting up your account, then continue with Google again.');
        return;
      }
      await completeAuthSession(data, 'You are signed in with Google.');
    } catch (e) {
      if (/expired or is invalid/i.test(e?.message || '')) setPendingGoogleIdToken('');
      reportError(e);
    } finally {
      setBusy(false);
    }
  }

  async function signInOrRegister() {
    clearMessages();
    if (authMode === 'register' && !fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!phone.trim() || !password) { setError('Enter your phone number and password.'); return; }
    if (authMode === 'register' && password.length < 8) { setError('Your password must contain at least 8 characters.'); return; }
    setBusy(true);
    try {
      const registering = authMode === 'register';
      const rawPhone = phone.trim().replace(/[\s()-]/g, '');
      const normalizedPhone = /^\+?232\d{8}$/.test(rawPhone) ? (rawPhone.startsWith('+') ? rawPhone : '+' + rawPhone) : /^0\d{8}$/.test(rawPhone) ? '+232' + rawPhone.slice(1) : /^\d{8}$/.test(rawPhone) ? '+232' + rawPhone : rawPhone;
      const data = await api(registering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(registering
          ? { full_name: fullName.trim(), phone: normalizedPhone, password, role }
          : { phone: normalizedPhone, password })
      });
      if (data.verificationRequired) {
        setToken(data.verificationToken);
        setUser(data.user);
        setRole(data.user.role);
        setScreen('verify-phone');
        setPassword('');
        setVerificationId('');
        setOtp('');
        setNotice(data.message || 'Verify your phone number to continue.');
        return;
      }
      await completeAuthSession(data, registering ? 'Your FixIt Salone account has been created.' : 'You are signed in.');
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }

  async function loadServices() {
    try { const rows = await api('/api/services'); setServices(Array.isArray(rows) ? rows : []); }
    catch (e) { setServices([]); }
  }
  async function loadProviders() {
    try { const rows = await api('/api/providers'); setProviders(Array.isArray(rows) ? rows : []); }
    catch (e) { setProviders([]); reportError(e); }
  }
  async function loadCustomerRequests() {
    try { const rows = await api('/api/service-requests/mine'); setJobs(Array.isArray(rows) ? rows : []); }
    catch (e) { reportError(e); }
  }
  async function loadPayments() {
    try { const rows = await api('/api/payments/mine'); setPayments(Array.isArray(rows) ? rows : []); }
    catch (e) { reportError(e); }
  }
  async function openJobPhotos(jobId) {
    setJobPhotosRequestId(String(jobId));
    setJobPhotos([]);
    setScreen('job-photos');
    clearMessages();
    setBusy(true);
    try {
      const rows = await api('/api/service-requests/' + encodeURIComponent(jobId) + '/photos');
      setJobPhotos(Array.isArray(rows) ? rows : []);
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function openConversation(jobId) {
    setConversationRequestId(String(jobId));
    setConversationMessages([]);
    setConversationDraft('');
    setScreen('conversation');
    clearMessages();
    setConversationBusy(true);
    try {
      const data = await api('/api/service-requests/' + encodeURIComponent(jobId) + '/messages');
      setConversationMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) { reportError(e); }
    finally { setConversationBusy(false); }
  }
  async function refreshConversation() {
    if (!conversationRequestId) return;
    setConversationBusy(true);
    try {
      const data = await api('/api/service-requests/' + encodeURIComponent(conversationRequestId) + '/messages');
      setConversationMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) { reportError(e); }
    finally { setConversationBusy(false); }
  }
  async function sendConversationMessage() {
    const message = conversationDraft.trim();
    if (!message || !conversationRequestId || conversationBusy) return;
    setConversationBusy(true);
    clearMessages();
    try {
      await api('/api/service-requests/' + encodeURIComponent(conversationRequestId) + '/messages', {
        method: 'POST', body: JSON.stringify({ message })
      });
      setConversationDraft('');
      const data = await api('/api/service-requests/' + encodeURIComponent(conversationRequestId) + '/messages');
      setConversationMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (e) { reportError(e); }
    finally { setConversationBusy(false); }
  }
  async function loadProviderWork(providerId = providerProfile?.id) {
    if (!providerId) { setProviderWorkItems([]); return []; }
    try {
      const rows = await api('/api/providers/' + encodeURIComponent(providerId) + '/work');
      const items = Array.isArray(rows) ? rows : [];
      setProviderWorkItems(items);
      return items;
    } catch (e) {
      setProviderWorkItems([]);
      reportError(e);
      return [];
    }
  }

  async function loadProviderDashboard() {
    try {
      const profileData = await api('/api/providers/me/profile');
      setProviderProfile(profileData.profile || null);
      setProviderServices(Array.isArray(profileData.services) ? profileData.services : []);
      if (profileData.profile) {
        await loadProviderWork(profileData.profile.id);
        setProviderForm(prev => ({
          ...prev, businessName: profileData.profile.business_name || '',
          region: profileData.profile.region || 'Western Area',
          district: profileData.profile.district || 'Western Area Urban',
          area: profileData.profile.area || '', address: profileData.profile.service_address || '',
          serviceId: profileData.services?.[0]?.service_id ? String(profileData.services[0].service_id) : prev.serviceId,
          pricingType: profileData.services?.[0]?.pricing_type || prev.pricingType,
          price: profileData.services?.[0]?.price_sle == null ? '' : String(profileData.services[0].price_sle),
          description: profileData.services?.[0]?.description || ''
        }));
      }
    } catch (e) { setProviderProfile(null); setProviderServices([]); }
    try {
      const suggestions = await api('/api/providers/me/profession-suggestions');
      setProfessionSuggestions(Array.isArray(suggestions) ? suggestions : []);
    } catch (e) { setProfessionSuggestions([]); }
    try {
      const data = await api('/api/provider/requests');
      setJobs(Array.isArray(data.requests) ? data.requests : []);
      setJobMeta(data);
    } catch (e) { setJobs([]); setJobMeta({}); }
    try { setSubscriptionInfo(await api('/api/provider/subscription')); }
    catch (e) { setSubscriptionInfo(null); }
    try {
      const rows = await api('/api/provider/notifications');
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch (e) { setNotifications([]); }
  }
  async function refreshHomeData() {
    clearMessages();
    setBusy(true);
    try {
      await loadServices();
      if (user?.role === 'provider') await loadProviderDashboard();
      else await Promise.all([loadProviders(), loadCustomerRequests()]);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (token && user?.id && screen !== 'verify-phone') {
      loadServices();
      if (user.role === 'provider') loadProviderDashboard();
      else { loadProviders(); loadCustomerRequests(); }
    }
  }, [token, user?.id, user?.role, screen]);

  useEffect(() => {
    if (!token || !['customer', 'provider'].includes(user?.role)) return;
    let active = true;
    SecureStore.getItemAsync('fixit-salone-push-disabled').then(disabled => {
      if (active && disabled !== 'true') return Notifications.getPermissionsAsync();
      return null;
    }).then(permission => {
      if (active && permission?.status === 'granted') return registerPushNotifications(false);
    }).catch(() => {});
    const handleNotificationResponse = response => {
      const payload = response?.notification?.request?.content?.data || {};
      const requestId = payload.requestId;
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      if (requestId && payload.type === 'new_message') {
        openConversation(requestId);
      } else if (requestId) {
        setScreen('requests');
        if (user?.role === 'provider') loadProviderDashboard();
        else loadCustomerRequests();
      } else if (user?.role === 'provider') {
        setScreen('notifications'); loadNotifications();
      } else {
        setScreen('requests'); loadCustomerRequests();
      }
    };
    const responseListener = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (active && response) handleNotificationResponse(response);
    }).catch(() => {});
    return () => { active = false; responseListener.remove(); };
  }, [token, user?.id, user?.role]);

  useEffect(() => {
    if (!token || user?.role !== 'customer' || screen !== 'home') return;
    const timer = setInterval(() => setHomepageSlideIndex(index => (index + 1) % HOME_HERO_SLIDES.length), 4500);
    return () => clearInterval(timer);
  }, [token, user?.role, screen]);

  useEffect(() => {
    if (!token || user?.role !== 'customer' || screen !== 'home' || categoryCarouselWidth <= 0 || CATEGORY_PAGES.length < 2) return;
    const timer = setInterval(() => {
      const nextPage = (categoryPageIndex + 1) % CATEGORY_PAGES.length;
      categoryCarouselRef.current?.scrollTo({ x: nextPage * categoryCarouselWidth, animated: true });
      setCategoryPageIndex(nextPage);
    }, 4500);
    return () => clearInterval(timer);
  }, [token, user?.role, screen, categoryCarouselWidth, categoryPageIndex]);

  function goToCategoryPage(index) {
    if (index < 0 || index >= CATEGORY_PAGES.length) return;
    categoryCarouselRef.current?.scrollTo({ x: index * categoryCarouselWidth, animated: true });
    setCategoryPageIndex(index);
  }

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const d = districtFilter.trim().toLowerCase();
    return providers.filter(p => {
      const text = [p.business_name, p.full_name, p.service_name, p.service_description, p.area].join(' ').toLowerCase();
      return (!q || text.includes(q)) &&
        (regionFilter === 'All' || p.region === regionFilter) &&
        (!d || String(p.district || '').toLowerCase().includes(d));
    });
  }, [providers, search, regionFilter, districtFilter]);

  async function openProvider(provider) {
    setSelectedProvider(provider);
    setProviderInfo(null);
    setSelectedServiceId(String(provider.service_id || ''));
    setScreen('provider-detail');
    clearMessages();
    try {
      const [details, reviewData, work] = await Promise.all([
        api('/api/providers/' + encodeURIComponent(provider.id)),
        api('/api/providers/' + encodeURIComponent(provider.id) + '/reviews').catch(() => ({ reviews: [], rating: 0, review_count: 0 })),
        api('/api/providers/' + encodeURIComponent(provider.id) + '/work').catch(() => [])
      ]);
      setProviderInfo({ ...details, reviews: reviewData.reviews || [], rating: reviewData.rating, reviewCount: reviewData.review_count, work: Array.isArray(work) ? work : [] });
      if (!provider.service_id && details.services?.[0]?.service_id) setSelectedServiceId(String(details.services[0].service_id));
    } catch (e) { reportError(e); }
  }

  function startRequest(provider, service) {
    if (!token || user?.role !== 'customer') {
      setError('Please sign in with a customer account to request a service.');
      setScreen('auth'); setAuthMode('login'); setRole('customer'); return;
    }
    setEditingRequest(null);
    setSelectedProvider(provider);
    setSelectedPhotos([]);
    setPendingPhotoRequestId('');
    setSelectedServiceId(String(service.service_id || service.id || provider.service_id || ''));
    const savedPhoneDigits = String(user?.phone || '').replace(/\D/g, '');
    const defaultContactPhone = savedPhoneDigits.startsWith('232') ? savedPhoneDigits.slice(3)
      : savedPhoneDigits.startsWith('0') && savedPhoneDigits.length === 9 ? savedPhoneDigits.slice(1) : savedPhoneDigits;
    setRequestForm({
      contactPhone: defaultContactPhone,
      region: provider.region || 'Western Area', district: provider.district || 'Western Area Urban',
      area: provider.area || '', address: provider.service_address || '', directions: '', details: '',
      pricingType: service.pricing_type || provider.pricing_type || 'quote_required'
    });
    setScreen('request-form');
    clearMessages();
  }
  function startEditingRequest(request) {
    if (!request || request.status !== 'requested') {
      setError('You can edit a request only before the provider responds.');
      return;
    }
    setEditingRequest(request);
    setSelectedProvider({ business_name: request.business_name || request.provider_name || 'your provider' });
    setSelectedPhotos([]);
    setPendingPhotoRequestId('');
    const savedPhoneDigits = String(request.contact_phone || user?.phone || '').replace(/\D/g, '');
    const defaultContactPhone = savedPhoneDigits.startsWith('232') ? savedPhoneDigits.slice(3)
      : savedPhoneDigits.startsWith('0') && savedPhoneDigits.length === 9 ? savedPhoneDigits.slice(1) : savedPhoneDigits;
    setRequestForm({
      contactPhone: defaultContactPhone,
      region: request.region || 'Western Area',
      district: request.district || 'Western Area Urban',
      area: request.area || '',
      address: request.service_address || '',
      directions: request.directions || '',
      details: request.job_details || '',
      pricingType: request.pricing_type || 'quote_required'
    });
    setScreen('request-form');
    clearMessages();
  }
  async function prepareRequestPhotoAssets(assets, existingPhotos = [], maxCount = 5) {
    const current = existingPhotos.slice();
    const combined = [...current];
    let tooLarge = false;
    let unsupported = false;
    let conversionFailed = false;
    for (const asset of assets || []) {
      if (!asset?.uri) continue;
      const reportedType = String(asset.mimeType || '').toLowerCase();
      let type = reportedType === 'image/jpg' ? 'image/jpeg' : reportedType;
      const fileHint = String(asset.fileName || asset.uri || '').split(/[?#]/, 1)[0];
      const isHeic = /^image\/(x-)?hei[cf](?:-sequence)?$/.test(type) || /\.(heic|heif)$/i.test(fileHint);
      let preparedAsset = asset;
      if (isHeic) {
        try {
          const width = Number(asset.width) || 0;
          const height = Number(asset.height) || 0;
          const actions = [];
          if (width >= height && width > 1920) actions.push({ resize: { width: 1920 } });
          else if (height > width && height > 1920) actions.push({ resize: { height: 1920 } });
          const converted = await ImageManipulator.manipulateAsync(asset.uri, actions, {
            compress: 0.82,
            format: ImageManipulator.SaveFormat.JPEG
          });
          const convertedFile = new File(converted.uri);
          preparedAsset = { ...asset, uri: converted.uri, fileName: 'request-photo.jpg', mimeType: 'image/jpeg', fileSize: convertedFile.size };
          type = 'image/jpeg';
        } catch {
          conversionFailed = true;
          continue;
        }
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) { unsupported = true; continue; }
      if (preparedAsset.fileSize != null && preparedAsset.fileSize > 10 * 1024 * 1024) { tooLarge = true; continue; }
      if (combined.some(photo => photo.uri === preparedAsset.uri)) continue;
      if (combined.length >= maxCount) break;
      combined.push({ ...preparedAsset, mimeType: type });
    }
    return {
      photos: combined.slice(0, maxCount),
      addedCount: Math.max(0, combined.length - current.length),
      tooLarge,
      unsupported,
      conversionFailed
    };
  }

  function photoPreparationMessage(prepared) {
    if (prepared.conversionFailed) return 'A HEIC/HEIF photo could not be converted. Please choose a JPG photo or turn off High efficiency pictures in Samsung Camera settings.';
    if (prepared.tooLarge) return 'A photo was skipped because it is larger than 10 MB. Please choose a smaller image.';
    if (prepared.unsupported) return 'This photo format is unsupported. Choose JPG, PNG, or WEBP.';
    return '';
  }

  async function addPickedPhotos(assets) {
    const prepared = await prepareRequestPhotoAssets(assets, selectedPhotos, 5);
    setSelectedPhotos(prepared.photos);
    const message = photoPreparationMessage(prepared);
    if (message) setError(message);
    else clearMessages();
    if (assets?.length && prepared.addedCount === 0 && !message) setNotice('You can attach up to 5 photos to a request.');
  }

  async function pickRequestPhotos() {
    if (pendingPhotoRequestId) { setError('This request was already created. Retry the photo upload before adding different photos.'); return; }
    const remaining = 5 - selectedPhotos.length;
    if (remaining <= 0) { setError('You can attach up to 5 photos. Remove one before adding another.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.6
      });
      if (!result.canceled) await addPickedPhotos(result.assets || []);
    } catch (e) {
      setError(e?.message || 'Could not open your photo library.');
    }
  }

  async function takeRequestPhoto() {
    if (pendingPhotoRequestId) { setError('This request was already created. Retry the photo upload before adding different photos.'); return; }
    if (selectedPhotos.length >= 5) { setError('You can attach up to 5 photos. Remove one before taking another.'); return; }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is needed to take a photo. You can still choose a photo from your gallery.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.4, exif: false, allowsEditing: false });
      if (!result.canceled) await addPickedPhotos(result.assets || []);
    } catch (e) {
      setError(e?.message || 'Could not open the camera.');
    }
  }

  async function uploadRequestPhotos(requestId, photos = selectedPhotos) {
    const form = new FormData();
    photos.forEach((photo, index) => {
      const reportedType = String(photo.mimeType || 'image/jpeg').toLowerCase();
      const type = reportedType === 'image/jpg' ? 'image/jpeg' : reportedType;
      const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const sourceFile = new File(photo.uri);
      const uploadName = 'fixit-request-' + String(requestId) + '-' + String(index + 1) + '-' + Date.now() + '.' + ext;
      form.append('photos', sourceFile, uploadName);
    });
    return api('/api/service-requests/' + encodeURIComponent(requestId) + '/photos', {
      method: 'POST',
      body: form
    });
  }

  async function saveServiceRequestEdits() {
    if (!editingRequest?.id) return;
    const rawContactPhone = String(requestForm.contactPhone || '').replace(/\D/g, '');
    const contactDigits = rawContactPhone.startsWith('232') ? rawContactPhone.slice(3)
      : rawContactPhone.startsWith('0') && rawContactPhone.length === 9 ? rawContactPhone.slice(1) : rawContactPhone;
    if (!/^\d{8}$/.test(contactDigits)) { setError('Enter the verified Sierra Leone account phone number with 8 digits after +232.'); return; }
    if (!requestForm.region.trim() || !requestForm.district.trim() || !requestForm.area.trim() || !requestForm.address.trim() || !requestForm.details.trim()) {
      setError('Complete the region, district, area, address and job details.'); return;
    }
    setBusy(true);
    clearMessages();
    try {
      await api('/api/service-requests/' + encodeURIComponent(editingRequest.id), {
        method: 'PATCH',
        body: JSON.stringify({
          region: requestForm.region.trim(), district: requestForm.district.trim(),
          area: requestForm.area.trim(), service_address: requestForm.address.trim(),
          directions: requestForm.directions.trim(), contact_phone: '+232' + contactDigits,
          pricing_type: requestForm.pricingType, job_details: requestForm.details.trim()
        })
      });
      setEditingRequest(null);
      await loadCustomerRequests();
      setScreen('requests');
      setNotice('Your service request was updated.');
    } catch (e) {
      setError(e?.message || 'Could not update this service request.');
    } finally {
      setBusy(false);
    }
  }

  async function addPhotosToExistingRequest() {
    if (!jobPhotosRequestId) return;
    const remaining = 5 - jobPhotos.length;
    if (remaining <= 0) { setError('This request already has the maximum of 5 photos.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.6
      });
      if (result.canceled) return;
      setBusy(true);
      clearMessages();
      const prepared = await prepareRequestPhotoAssets(result.assets || [], [], remaining);
      if (!prepared.photos.length) {
        setError(photoPreparationMessage(prepared) || 'No supported new photos were selected.');
        return;
      }
      await uploadRequestPhotos(jobPhotosRequestId, prepared.photos);
      const rows = await api('/api/service-requests/' + encodeURIComponent(jobPhotosRequestId) + '/photos');
      setJobPhotos(Array.isArray(rows) ? rows : []);
      const message = photoPreparationMessage(prepared);
      setNotice(message ? 'The selected photos were attached; ' + message.charAt(0).toLowerCase() + message.slice(1) : 'Photos uploaded successfully to request ' + jobPhotosRequestId + '.');
    } catch (e) {
      setError(e?.message || 'Could not upload photos to this request.');
    } finally {
      setBusy(false);
    }
  }

  async function createServiceRequest() {
    if (pendingPhotoRequestId) {
      setBusy(true); clearMessages();
      try {
        await uploadRequestPhotos(pendingPhotoRequestId);
        setSelectedPhotos([]);
        setPendingPhotoRequestId('');
        setNotice('Photos uploaded successfully to request ' + pendingPhotoRequestId + '.');
        await loadCustomerRequests();
        setScreen('requests');
      } catch (e) {
        setError('Your request ' + pendingPhotoRequestId + ' already exists, but the photos did not upload: ' + (e?.message || 'Upload failed.') + ' Tap “Retry photo upload”. Do not submit a second request.');
      } finally { setBusy(false); }
      return;
    }

    if (!selectedProvider || !selectedServiceId) { setError('Please choose a provider service first.'); return; }
    const rawContactPhone = String(requestForm.contactPhone || '').replace(/\D/g, '');
    const contactDigits = rawContactPhone.startsWith('232') ? rawContactPhone.slice(3)
      : rawContactPhone.startsWith('0') && rawContactPhone.length === 9 ? rawContactPhone.slice(1) : rawContactPhone;
    if (!/^\d{8}$/.test(contactDigits)) { setError('Enter a valid Sierra Leone contact phone number with 8 digits after +232.'); return; }
    if (!requestForm.region.trim() || !requestForm.district.trim() || !requestForm.area.trim() || !requestForm.address.trim() || !requestForm.details.trim()) {
      setError('Complete the region, district, area, address and job details.'); return;
    }
    setBusy(true); clearMessages();
    try {
      const created = await api('/api/service-requests', {
        method: 'POST',
        body: JSON.stringify({
          provider_id: selectedProvider.id, service_id: selectedServiceId,
          region: requestForm.region.trim(), district: requestForm.district.trim(),
          area: requestForm.area.trim(), service_address: requestForm.address.trim(),
          directions: requestForm.directions.trim(), contact_phone: '+232' + contactDigits,
          pricing_type: requestForm.pricingType, job_details: requestForm.details.trim()
        })
      });

      if (selectedPhotos.length) {
        setPendingPhotoRequestId(String(created.id));
        try {
          await uploadRequestPhotos(created.id);
        } catch (uploadError) {
          setError('Your request ' + created.id + ' was created, but the photos did not upload: ' + (uploadError?.message || 'Upload failed.') + ' Tap “Retry photo upload”. Do not submit a second request.');
          return;
        }
      }

      setSelectedPhotos([]);
      setPendingPhotoRequestId('');
      setNotice('Service request submitted successfully. Request reference: ' + created.id + (selectedPhotos.length ? ' Photos attached.' : ''));
      await loadCustomerRequests();
      setScreen('requests');
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }

  async function uploadCompletionPhotos(jobId, stage) {
    setBusy(true); clearMessages();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.65, exif: false });
      if (result.canceled || !result.assets?.length) return;
      const form = new FormData();
      result.assets.slice(0, 5).forEach((asset, i) => form.append('photos', { uri: asset.uri, name: asset.fileName || (stage + '-' + (i + 1) + '.jpg'), type: asset.mimeType || 'image/jpeg' }));
      form.append('photo_stage', stage);
      await api('/api/service-requests/' + encodeURIComponent(jobId) + '/photos', { method: 'POST', body: form });
      setNotice((stage === 'before' ? 'Before-work' : 'After-work') + ' photos uploaded.');
      await loadProviderDashboard();
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function submitCompletion(jobId) {
    setBusy(true); clearMessages();
    try {
      await api('/api/service-requests/' + encodeURIComponent(jobId) + '/completion-submit', { method: 'POST', body: JSON.stringify({}) });
      setNotice('Job submitted for customer confirmation.');
      await loadProviderDashboard();
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function confirmCompletion(jobId) {
    Alert.alert('Confirm completed work', 'Confirm that the provider has completed the work satisfactorily?', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        setBusy(true); clearMessages();
        try {
          await api('/api/service-requests/' + encodeURIComponent(jobId) + '/completion-confirm', { method: 'POST', body: JSON.stringify({}) });
          setNotice('Job completion confirmed. Thank you.');
          await loadCustomerRequests();
        } catch (e) { reportError(e); }
        finally { setBusy(false); }
      } }
    ]);
  }
  async function reportCompletionIssue(jobId) {
    Alert.alert('Report a problem', 'Please use the job conversation to describe the issue to the provider. The job will remain unconfirmed.');
    await openConversation(jobId);
  }
  async function setJobStatus(jobId, status) {
    const labels = { approved: 'approve this quote', declined: 'decline this quote', cancelled: 'cancel this request', in_progress: 'start this job', completed: 'mark this job completed' };
    const prompt = labels[status] || 'change this job';
    Alert.alert('Confirm action', 'Are you sure you want to ' + prompt + '?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Continue', onPress: async () => {
        setBusy(true); clearMessages();
        try {
          await api('/api/service-requests/' + encodeURIComponent(jobId) + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
          setNotice('Job status updated.');
          if (user?.role === 'provider') await loadProviderDashboard();
          else await loadCustomerRequests();
        } catch (e) { reportError(e); }
        finally { setBusy(false); }
      } }
    ]);
  }
  async function preparePayment(jobId) {
    setBusy(true); clearMessages();
    try {
      const result = await api('/api/payments/intent', { method: 'POST', body: JSON.stringify({ service_request_id: jobId }) });
      const p = result.payment || {};
      Alert.alert('Payment not connected yet', (result.message || 'No money was collected.') +
        '\nJob total: SLE ' + Number(p.amount_sle || 0).toLocaleString() +
        '\nFixIt fee: SLE ' + Number(p.platform_fee || 0).toLocaleString() +
        '\nPayment status: ' + String(p.status || 'pending'));
      await loadCustomerRequests();
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function submitReview(jobId) {
    setBusy(true); clearMessages();
    try {
      await api('/api/service-requests/' + encodeURIComponent(jobId) + '/review', {
        method: 'POST', body: JSON.stringify({ rating: reviewRating, review_text: reviewText.trim() })
      });
      setNotice('Your review has been submitted.');
      setReviewJobId(''); setReviewText(''); setReviewRating(5);
      await loadCustomerRequests();
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }

  function openProviderSetup() {
    setProviderForm(prev => ({
      ...prev, businessName: providerProfile?.business_name || prev.businessName,
      region: providerProfile?.region || prev.region, district: providerProfile?.district || prev.district,
      area: providerProfile?.area || prev.area, address: providerProfile?.service_address || prev.address,
      serviceId: providerServices[0]?.service_id ? String(providerServices[0].service_id) : prev.serviceId,
      pricingType: providerServices[0]?.pricing_type || prev.pricingType,
      price: providerServices[0]?.price_sle == null ? prev.price : String(providerServices[0].price_sle),
      description: providerServices[0]?.description || prev.description
    }));
    setScreen('provider-setup');
    clearMessages();
  }
  async function saveProviderProfile() {
    const requestingOtherProfession = providerForm.serviceId === '__other__';
    if (!providerForm.businessName.trim() || !providerForm.region.trim() || !providerForm.district.trim() ||
        !providerForm.area.trim() || !providerForm.address.trim() || !providerForm.serviceId ||
        (requestingOtherProfession && !providerForm.otherProfession.trim())) {
      setError(requestingOtherProfession
        ? 'Complete your business details and enter the profession you want us to add.'
        : 'Complete your business name, location and main service.'); return;
    }
    setBusy(true); clearMessages();
    try {
      const saved = await api('/api/providers/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          business_name: providerForm.businessName.trim(), region: providerForm.region.trim(),
          district: providerForm.district.trim(), area: providerForm.area.trim(),
          service_address: providerForm.address.trim()
        })
      });
      if (requestingOtherProfession) {
        await api('/api/providers/me/profession-suggestions', {
          method: 'POST',
          body: JSON.stringify({
            name: providerForm.otherProfession.trim(), pricing_type: providerForm.pricingType,
            price_sle: providerForm.price.trim() ? Number(providerForm.price) : null,
            description: providerForm.description.trim()
          })
        });
      } else {
        await api('/api/providers/me/services', {
          method: 'POST',
          body: JSON.stringify({
            service_id: providerForm.serviceId, pricing_type: providerForm.pricingType,
            price_sle: providerForm.price.trim() ? Number(providerForm.price) : null,
            description: providerForm.description.trim()
          })
        });
      }
      setProviderProfile(saved.profile);
      setNotice(requestingOtherProfession
        ? `Your profile was saved. “${providerForm.otherProfession.trim()}” was sent for review. It will appear in the service list after approval.`
        : 'Your provider profile and main service have been saved. You can now add work samples below.');
      await loadProviderDashboard();
      // Keep this screen open so the provider can continue directly to Portfolio / Work samples.
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function pickProviderWorkAsset() {
    clearMessages();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.7,
        videoMaxDuration: 90
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      const type = String(asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')).toLowerCase();
      const accepted = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
      if (!accepted.includes(type)) {
        setError('Choose a JPG, PNG or WEBP image, or an MP4/WebM video.');
        return;
      }
      if (asset.fileSize != null && asset.fileSize > 15 * 1024 * 1024) {
        setError('Please choose a file smaller than 15 MB.');
        return;
      }
      setWorkAsset({ ...asset, uploadMimeType: type });
      setNotice('Work sample selected. Add a caption, then upload it to your portfolio.');
    } catch (e) {
      reportError(e);
    }
  }

  async function uploadProviderWork() {
    if (user?.role !== 'provider') { setError('Only service provider accounts can upload work samples.'); return; }
    if (!providerProfile?.id) {
      setError('Save your business profile first, then reopen this page to upload work samples.');
      return;
    }
    if (!workAsset?.uri) { setError('Choose a photo or video of your work first.'); return; }
    if (!workCaption.trim()) { setError('Add a short caption describing this work sample.'); return; }

    const mimeType = workAsset.uploadMimeType || workAsset.mimeType || 'image/jpeg';
    const extension = mimeType === 'image/png' ? 'png'
      : mimeType === 'image/webp' ? 'webp'
      : mimeType === 'video/webm' ? 'webm'
      : mimeType === 'video/mp4' ? 'mp4' : 'jpg';

    setWorkUploadBusy(true);
    clearMessages();
    try {
      const sourceFile = new File(workAsset.uri);
      const fileName = 'fixit-work-' + Date.now() + '.' + extension;
      const uploadFile = new File(Paths.cache, fileName);
      sourceFile.copy(uploadFile);

      const form = new FormData();
      form.append('media', uploadFile);
      form.append('caption', workCaption.trim());
      const savedItem = await api('/api/providers/' + encodeURIComponent(providerProfile.id) + '/work', {
        method: 'POST',
        body: form
      });

      // Show the newly saved item immediately; a background refresh must not hide a successful upload.
      const visibleItem = {
        ...savedItem,
        file_url: '/api/providers/' + encodeURIComponent(providerProfile.id) + '/work/' + encodeURIComponent(savedItem.id) + '/file'
      };
      setProviderWorkItems(items => [visibleItem, ...items.filter(item => String(item.id) !== String(visibleItem.id))]);
      setWorkAsset(null);
      setWorkCaption('');
      setNotice(savedItem.storage_persistent === false
        ? 'Work sample uploaded. Note: permanent media storage is not configured yet, so this file could be lost if the server restarts.'
        : 'Your work sample has been added to your portfolio.');
    } catch (e) {
      reportError(e);
    } finally {
      setWorkUploadBusy(false);
    }
  }

  function deleteProviderWork(item) {
    if (!providerProfile?.id || !item?.id) return;
    Alert.alert('Remove work sample?', 'This item will be removed from your public portfolio.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setWorkUploadBusy(true);
        clearMessages();
        try {
          await api('/api/providers/' + encodeURIComponent(providerProfile.id) + '/work/' + encodeURIComponent(item.id), { method: 'DELETE' });
          setProviderWorkItems(items => items.filter(existing => String(existing.id) !== String(item.id)));
          setNotice('Work sample removed.');
        } catch (e) {
          reportError(e);
        } finally {
          setWorkUploadBusy(false);
        }
      } }
    ]);
  }

  async function sendQuote(jobId) {
    const labour = Number(quoteForm.labour || 0);
    const materials = Number(quoteForm.materials || 0);
    const transport = Number(quoteForm.transport || 0);
    if ([labour, materials, transport].some(v => !Number.isFinite(v) || v < 0) || labour + materials + transport <= 0) {
      setError('Enter valid costs. The total quote must be greater than zero.'); return;
    }
    setBusy(true); clearMessages();
    try {
      await api('/api/service-requests/' + encodeURIComponent(jobId) + '/quote', {
        method: 'PATCH',
        body: JSON.stringify({ labour_amount: labour, materials_amount: materials, transport_amount: transport })
      });
      setNotice('Your itemized quote was sent to the customer.');
      setQuoteJobId(''); setQuoteForm({ labour: '', materials: '', transport: '' });
      await loadProviderDashboard();
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function downloadQuotePdf(job) {
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const money = value => 'SLE ' + Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const total = Number(job.quoted_amount || 0);
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#252D2A;padding:28px;font-size:12px}
        .brand{font-size:24px;font-weight:800;color:#176B50;letter-spacing:.3px}
        .tag{color:#5F6B65;margin-top:4px;font-size:11px}
        .rule{height:3px;background:#176B50;margin:20px 0}
        h1{font-size:21px;margin:0 0 6px}
        .meta{color:#5F6B65;line-height:1.7}
        table{width:100%;border-collapse:collapse;margin-top:22px}
        th{background:#E8F4EE;text-align:left;color:#176B50}
        th,td{padding:12px;border-bottom:1px solid #DCE7E0}
        td.amount,th.amount{text-align:right}
        .total{margin-top:18px;background:#E8F4EE;padding:16px;border-radius:8px;text-align:right}
        .total span{font-size:12px;color:#5F6B65}.total strong{display:block;font-size:23px;color:#176B50;margin-top:5px}
        .note{margin-top:26px;color:#5F6B65;line-height:1.6;font-size:10px}
      </style></head><body>
      <div class="brand">FixIt Salone</div><div class="tag">Your Trusted Home &amp; Repair Services in Sierra Leone</div><div class="rule"></div>
      <h1>Service Quotation</h1>
      <div class="meta">Request ID: ${escapeHtml(job.id)}<br>Service: ${escapeHtml(job.service_name || 'Service request')}<br>Provider: ${escapeHtml(job.business_name || job.provider_name || 'FixIt Salone provider')}<br>Date: ${escapeHtml(job.created_at ? new Date(job.created_at).toLocaleDateString() : new Date().toLocaleDateString())}<br>Status: ${escapeHtml(job.status || 'quoted')}</div>
      <table><thead><tr><th>Description</th><th class="amount">Amount</th></tr></thead><tbody>
      <tr><td>Labour</td><td class="amount">${money(job.labour_amount)}</td></tr>
      <tr><td>Materials</td><td class="amount">${money(job.materials_amount)}</td></tr>
      <tr><td>Transport</td><td class="amount">${money(job.transport_amount)}</td></tr>
      </tbody></table>
      <div class="total"><span>Total quotation</span><strong>${money(total)}</strong></div>
      <div class="note">Please review the itemized costs before approving this quotation in the FixIt Salone app. This document is a quotation, not a payment receipt. Online service payments are not currently processed by FixIt Salone.</div>
      </body></html>`;
    setBusy(true); clearMessages();
    try {
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Save or share FixIt Salone quotation', UTI: 'com.adobe.pdf' });
        setNotice('Your quotation PDF is ready. Choose an option to save or share it.');
      } else {
        setNotice('Your quotation PDF was created at ' + file.uri);
        Alert.alert('Quotation PDF created', 'The PDF was created, but sharing is not available on this device.');
      }
    } catch (e) {
      setError('Could not create the quotation PDF. Please try again. ' + (e?.message || ''));
    } finally { setBusy(false); }
  }

  async function createPaymentReceiptPdf(job) {
    const amount = Number(receiptAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter the amount actually received before creating a receipt.');
      return;
    }
    if (!receiptConfirmed) {
      setError('Please confirm that you have received this payment before issuing a receipt.');
      return;
    }
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const money = value => 'SLE ' + Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
    const receiptNumber = 'FS-' + String(job.id).replace(/[^a-zA-Z0-9-]/g, '') + '-' + Date.now().toString().slice(-6);
    const issuedAt = new Date().toLocaleString();
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#252D2A;padding:28px;font-size:12px}
        .brand{font-size:24px;font-weight:800;color:#176B50}.tag{color:#5F6B65;margin-top:4px;font-size:11px}
        .rule{height:3px;background:#176B50;margin:20px 0}h1{font-size:22px;margin:0 0 8px;color:#176B50}
        .meta{color:#5F6B65;line-height:1.8}.paid{margin-top:20px;background:#E8F4EE;border:1px solid #B7DCC8;border-radius:8px;padding:18px;text-align:center}
        .paid strong{display:block;font-size:27px;color:#176B50;margin-top:6px}
        table{width:100%;border-collapse:collapse;margin-top:22px}th,td{padding:11px;border-bottom:1px solid #DCE7E0;text-align:left}
        .note{margin-top:28px;color:#5F6B65;line-height:1.6;font-size:10px}
      </style></head><body>
      <div class="brand">FixIt Salone</div><div class="tag">Your Trusted Home &amp; Repair Services in Sierra Leone</div><div class="rule"></div>
      <h1>Payment Receipt</h1>
      <div class="meta">Receipt No: ${escapeHtml(receiptNumber)}<br>Issued: ${escapeHtml(issuedAt)}<br>Service request: ${escapeHtml(job.id)}<br>Service: ${escapeHtml(job.service_name || 'Repair service')}<br>Provider: ${escapeHtml(job.business_name || job.provider_name || user?.name || 'Service provider')}<br>Customer: ${escapeHtml(job.customer_name || 'Customer')}</div>
      <div class="paid">PAYMENT RECEIVED<strong>${money(amount)}</strong></div>
      <table><tbody><tr><th>Payment method</th><td>${escapeHtml(receiptMethod)}</td></tr>
      <tr><th>Payment reference</th><td>${escapeHtml(receiptReference.trim() || 'Not provided')}</td></tr>
      <tr><th>Service quotation</th><td>${money(job.quoted_amount)}</td></tr></tbody></table>
      <div class="note">This receipt was issued by the service provider to acknowledge payment received. Please retain it for your records. FixIt Salone does not independently verify or process this payment.</div>
      </body></html>`;
    setBusy(true); clearMessages();
    try {
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'Save or share payment receipt', UTI: 'com.adobe.pdf' });
        setNotice('Receipt PDF is ready to save or share.');
        setReceiptJobId('');
        setReceiptConfirmed(false);
      } else {
        setNotice('Receipt PDF created at ' + file.uri);
        Alert.alert('Receipt PDF created', 'The PDF was created, but sharing is not available on this device.');
      }
    } catch (e) {
      setError('Could not create the receipt PDF. Please try again. ' + (e?.message || ''));
    } finally { setBusy(false); }
  }

  async function openSubscription() {
    setScreen('subscription'); clearMessages();
    try { setSubscriptionInfo(await api('/api/provider/subscription')); }
    catch (e) { reportError(e); }
  }
  async function requestSubscription(plan) {
    setBusy(true); clearMessages();
    try {
      const result = await api('/api/provider/subscription/request', { method: 'POST', body: JSON.stringify({ plan_name: plan }) });
      Alert.alert('Subscription request recorded', result.message || 'No payment was collected.');
      await openSubscription();
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function loadNotifications() {
    setScreen('notifications'); clearMessages();
    try { const rows = await api('/api/provider/notifications'); setNotifications(Array.isArray(rows) ? rows : []); }
    catch (e) { reportError(e); }
  }
  async function markNotificationRead(id) {
    try {
      await api('/api/provider/notifications/' + encodeURIComponent(id) + '/read', { method: 'PATCH', body: JSON.stringify({}) });
      setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, is_read: true } : n));
    } catch (e) { reportError(e); }
  }
  async function loadVerification() {
    setScreen('verification'); clearMessages();
    try { setVerifyStatus(await api('/api/verification/' + encodeURIComponent(user.id))); }
    catch (e) { reportError(e); }
  }
  function saveIdentityAsset(asset, kind) {
    if (!asset?.uri) return;
    const mimeType = String(asset.mimeType || 'image/jpeg').toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      setError('Please use a JPG, PNG or WEBP image for identity verification.');
      return;
    }
    if (asset.fileSize != null && Number(asset.fileSize) > 5 * 1024 * 1024) {
      setError('Each identity image must be 5 MB or smaller. Please choose or capture a smaller image.');
      return;
    }
    const prepared = { ...asset, mimeType };
    if (kind === 'document') setIdentityDocumentAsset(prepared);
    else setIdentitySelfieAsset(prepared);
    clearMessages();
  }

  async function pickIdentityDocument() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8
      });
      if (!result.canceled && result.assets?.[0]) saveIdentityAsset(result.assets[0], 'document');
    } catch (e) {
      setError(e?.message || 'Could not open your photo library. Please try again.');
    }
  }

  async function takeIdentitySelfie() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera permission is needed to take a selfie. Enable camera access in your phone settings, then try again.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: 'front',
        quality: 0.8
      });
      if (!result.canceled && result.assets?.[0]) saveIdentityAsset(result.assets[0], 'selfie');
    } catch (e) {
      setError(e?.message || 'Could not open the front camera. Please try again.');
    }
  }

  async function appendIdentityUpload(form, fieldName, asset, kind) {
    const mimeType = String(asset.mimeType || 'image/jpeg').toLowerCase();
    const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const uploadName = 'fixit-identity-' + kind + '-' + Date.now() + '.' + extension;
    const sourceFile = new File(asset.uri);
    const uploadFile = new File(Paths.cache, uploadName);
    sourceFile.copy(uploadFile);
    form.append(fieldName, uploadFile);
  }

  async function submitIdentityVerification() {
    if (verifyStatus?.phone_status !== 'verified') {
      setError('Verify your phone number before submitting identity verification.');
      return;
    }
    const currentStatus = String(verifyStatus?.identity?.status || 'unverified').toLowerCase();
    if (currentStatus === 'verified') {
      setNotice('Your identity is already verified.');
      return;
    }
    if (currentStatus === 'pending' || currentStatus === 'under_review') {
      setNotice('Your identity submission is already under review. You do not need to submit it again.');
      return;
    }
    if (!identityDocumentAsset || !identitySelfieAsset) {
      setError('Please provide both a photo of your identity document and a selfie.');
      return;
    }
    setBusy(true); clearMessages();
    try {
      const form = new FormData();
      form.append('document_type', 'national_id');
      await appendIdentityUpload(form, 'document', identityDocumentAsset, 'document');
      await appendIdentityUpload(form, 'selfie', identitySelfieAsset, 'selfie');
      const result = await api('/api/verification/identity', { method: 'POST', body: form });
      setIdentityDocumentAsset(null);
      setIdentitySelfieAsset(null);
      setNotice(result.message || 'Identity verification submitted securely for review.');
      try {
        const status = await api('/api/verification/' + encodeURIComponent(user.id));
        setVerifyStatus(status);
      } catch {
        // Keep the successful submission message visible if refreshing status fails.
      }
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp() {
    setBusy(true); clearMessages();
    try {
      const result = await api('/api/phone-verification/request', { method: 'POST', body: JSON.stringify({}) });
      setVerificationId(String(result.verification?.id || ''));
      setOtp('');
      setNotice(result.message || 'Check your phone for the verification code.');
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function verifyOtp() {
    if (!verificationId || !otp.trim()) { setError('Request a code and enter it first.'); return; }
    setBusy(true); clearMessages();
    try {
      const result = await api('/api/phone-verification/verify', {
        method: 'POST', body: JSON.stringify({ verification_id: verificationId, otp: otp.trim() })
      });
      setNotice('Phone number verified successfully.');
      setVerificationId(''); setOtp('');
      if (result.token && result.user) {
        setToken(result.token);
        setUser(result.user);
        setRole(result.user.role);
        setScreen('home');
        await loadProfilePhoto(result.token, result.user.role);
        setNotice('Phone verified. Welcome to FixIt Salone.');
      } else {
        await loadVerification();
      }
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function submitSafetyReport() {
    if (!incidentDetails.trim()) { setError('Please describe what happened.'); return; }
    setBusy(true); clearMessages();
    try {
      await api('/api/incidents', {
        method: 'POST',
        body: JSON.stringify({
          reported_user_id: incidentReportedUserId || selectedProvider?.user_id || null,
          job_id: incidentJobId || null,
          reason: incidentReason, details: incidentDetails.trim()
        })
      });
      setIncidentDetails('');
      setIncidentReportedUserId('');
      setIncidentJobId('');
      setNotice('Your safety report has been recorded for review.');
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
  }
  async function sendSupportMessage() {
    const message = chatInput.trim();
    if (!message) return;
    const history = chatMessages.slice(-10);
    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
    setChatInput('');
    setBusy(true); clearMessages();
    try {
      const result = await api('/api/support/chat', { method: 'POST', body: JSON.stringify({ message, history }) });
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.reply || 'Please contact FixIt Salone support for help with this request.' }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'I could not reach support just now. Please email kamarajoseph247@gmail.com or call/WhatsApp +232 31 864040.' }]);
    } finally { setBusy(false); }
  }
  function signOut() {
    if (pushToken) api('/api/push-token', { method: 'DELETE', body: JSON.stringify({ token: pushToken }) }).catch(() => {});
    SecureStore.deleteItemAsync('fixit-salone-session-token').catch(() => {});
    setToken(''); setUser(null); setScreen('auth'); setAuthMode('login'); setPassword('');
    setPushToken('');
    setProfilePhotoUrl(''); setProfilePhotoBusy(false);
    setJobs([]); setProviders([]); setServices([]); setProviderProfile(null); setProviderServices([]);
    setSubscriptionInfo(null); setNotifications([]); clearMessages();
  }

  const pageTitle = screen === 'home' ? (user?.role === 'provider' ? 'Provider dashboard' : 'Find a professional')
    : screen === 'providers' ? 'Find a professional'
    : screen === 'requests' ? (user?.role === 'provider' ? 'Incoming jobs' : 'My Jobs')
    : screen === 'inbox' ? 'Message Inbox'
    : screen === 'job-photos' ? 'Job photos'
    : screen === 'account' ? 'Your account'
    : screen === 'provider-detail' ? 'Provider profile'
    : screen === 'request-form' ? 'Request a service'
    : screen === 'provider-setup' ? 'Business profile'
    : screen === 'subscription' ? 'Provider plans'
    : screen === 'notifications' ? 'Notifications'
    : screen === 'verification' ? 'Account verification'
    : screen === 'safety' ? 'Safety Center'
    : screen === 'support' ? 'FixIt Support'
    : screen === 'payments' ? 'Payment records' : 'FixIt Salone';

  const providerPendingJobs = user?.role === 'provider'
    ? jobs.filter(j => String(j.status || '').toLowerCase() === 'requested')
    : [];
  const providerActiveJobs = user?.role === 'provider'
    ? jobs.filter(j => ['quoted', 'approved', 'in_progress'].includes(String(j.status || '').toLowerCase()))
    : [];

  const noticePanel = error || notice ? (
    <View style={[styles.message, error ? styles.messageError : styles.messageSuccess]}>
      <Text style={[styles.messageText, error && styles.errorText]}>{error || notice}</Text>
      <Pressable onPress={clearMessages}><Text style={styles.messageClose}>×</Text></Pressable>
    </View>
  ) : null;

  if (showSplash || restoringSession) {
    return (
      <View style={styles.splashRoot}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFE0C2" />
        <View pointerEvents="none" style={styles.splashTopGlow} />
        <View pointerEvents="none" style={styles.splashBottomGlow} />
        <View style={styles.splashContent}>
          <View style={styles.splashBrandArea}>
            <View style={styles.splashToolMark}>
              <Text style={styles.splashWrench}>🔧</Text>
              <Text style={styles.splashHammer}>🔨</Text>
            </View>
            <Text style={styles.splashWordmark}>
              <Text style={styles.splashWordmarkNavy}>FixIt</Text>
              <Text style={styles.splashWordmarkOrange}> Salone</Text>
            </Text>
          </View>

          <View style={styles.splashIllustrationArea}>
            <View pointerEvents="none" style={styles.splashHalo} />
            <View style={styles.splashIllustrationRow}>
              <View style={[styles.splashIconTile, styles.splashToolboxTile]}><Text style={styles.splashIconLarge}>🧰</Text></View>
              <View style={[styles.splashIconTile, styles.splashTechTile]}><Text style={styles.splashIconLarge}>🖥️</Text></View>
              <View style={[styles.splashIconTile, styles.splashLightTile]}><Text style={styles.splashIconLarge}>💡</Text></View>
            </View>
            <View style={[styles.splashIllustrationRow, styles.splashIllustrationRowMiddle]}>
              <View style={[styles.splashIconTile, styles.splashToolTile]}><Text style={styles.splashIconLarge}>🔧</Text></View>
              <View style={styles.splashHomeTile}>
                <Text style={styles.splashHouseIcon}>🏠</Text>
                <View style={styles.splashHomeWindow}>
                  <View style={styles.splashHomeWindowPane} />
                  <View style={styles.splashHomeWindowPane} />
                  <View style={styles.splashHomeWindowPane} />
                  <View style={styles.splashHomeWindowPane} />
                </View>
              </View>
              <View style={[styles.splashIconTile, styles.splashCleanTile]}><Text style={styles.splashIconLarge}>🧹</Text></View>
            </View>
            <View style={styles.splashIllustrationRow}>
              <View style={[styles.splashIconTile, styles.splashToolTile]}><Text style={styles.splashIconLarge}>🪛</Text></View>
              <View style={[styles.splashIconTile, styles.splashPaintTile]}><Text style={styles.splashIconLarge}>🖌️</Text></View>
              <View style={[styles.splashIconTile, styles.splashSolarTile]}>
                <Text style={styles.splashIconLarge}>☀️</Text>
                <Text style={styles.splashMiniIcon}>▰ ▰</Text>
              </View>
            </View>
            <View style={styles.splashOrbitToolOne}><Text style={styles.splashOrbitIcon}>⚒</Text></View>
            <View style={styles.splashOrbitToolTwo}><Text style={styles.splashOrbitIcon}>🔧</Text></View>
          </View>

          <Text style={styles.splashTagline}>Your Trusted Home &amp; Repair{'\n'}Services in Sierra Leone</Text>

          <View style={styles.splashLoadingArea}>
            <View style={styles.splashDotsRow}>
              <SplashDot delay={0} />
              <SplashDot delay={160} />
              <SplashDot delay={320} />
              <SplashDot delay={480} />
              <SplashDot delay={640} />
            </View>
            <View style={styles.splashProgressTrack}>
              <Animated.View style={[styles.splashProgressFill, {
                width: splashProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
              }]} />
            </View>
          </View>

          <View style={styles.splashFooter}>
            <Text style={styles.splashFooterPowered}>Powered by</Text>
            <Text style={styles.splashFooterCompany}>A Service of Sierra Services Ltd.</Text>
          </View>
        </View>
      </View>
    );
  }

  if (screen === 'verify-phone' && token && user) {
    return (
      <View style={styles.authSafe}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.pale} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authScreen}>
            <View style={styles.authWelcomePanel}>
              <Text style={styles.authWelcomeTitle}>Verify your phone</Text>
              <Text style={styles.authWelcomeCopy}>We need to confirm that {user.phone} belongs to you before you can use FixIt Salone.</Text>
            </View>
            <View style={styles.authDetailsPanel}>
              {noticePanel}
              <Button title={busy ? 'Sending…' : 'Send verification code by SMS'} onPress={requestOtp} disabled={busy} />
              {!!verificationId && <>
                <Field label="SMS verification code" value={otp} onChangeText={setOtp} placeholder="Enter the code you received" keyboardType="number-pad" autoCapitalize="none" />
                <Button title={busy ? 'Verifying…' : 'Verify phone and continue'} onPress={verifyOtp} disabled={busy} />
              </>}
              <Button title="Back to sign in" secondary onPress={() => { setToken(''); setUser(null); setScreen('auth'); setAuthMode('login'); setPassword(''); setVerificationId(''); setOtp(''); clearMessages(); }} />
              <Text style={styles.helper}>Verification codes expire. Never share your code with anyone.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  if (!token || !user) {
    return (
      <View style={styles.authSafe}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.pale} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authScreen}>
            <View style={styles.authBrandHeader}>
              <View style={styles.authHouseMark}>
                <View style={styles.authRoofLeft} /><View style={styles.authRoofRight} />
                <View style={styles.authHouseBody}><View style={styles.authHouseWindow} /></View>
              </View>
              <Text style={styles.authBrandTitle}><Text style={styles.authBrandGreen}>FixIt</Text><Text style={styles.authBrandDark}> Salone</Text></Text>
              <Text style={styles.authTagline}>Your Trusted Home &amp; Repair Services{'\n'}in Sierra Leone</Text>
            </View>

            <View style={styles.authWelcomePanel}>
              <View style={styles.authScenicHouse}>
                <View style={styles.authScenicRoofLeft} /><View style={styles.authScenicRoofRight} />
                <View style={styles.authScenicHome}><View style={styles.authScenicWindow} /><View style={styles.authScenicWindow} /></View>
              </View>
              <Text style={styles.authWelcomeTitle}>{authMode === 'login' ? 'Welcome back' : 'Welcome to FixIt'}</Text>
              <Text style={styles.authWelcomeCopy}>{authMode === 'register' ? (role === 'customer' ? 'Create an account to book trusted local services.' : 'Join as a professional and manage customer jobs.') : <>Choose how you want to use{'\n'}FixIt Salone.</>}</Text>
              <View style={styles.authRoleRow}>
                <AuthRoleChoice active={role === 'customer'} icon="customer" title="Customer" subtitle="Find services, book jobs" onPress={() => setRole('customer')} />
                <AuthRoleChoice active={role === 'provider'} icon="provider" title="Service provider" subtitle="Offer services, manage jobs" onPress={() => setRole('provider')} />
              </View>
              {authMode === 'register' && (
                <View style={styles.authOnboardingHint}>
                  <Text style={styles.authOnboardingHintTitle}>{role === 'customer' ? 'Ready to book a service?' : 'Ready to grow your service business?'}</Text>
                  <Text style={styles.authOnboardingHintCopy}>{role === 'customer' ? 'Use a phone number you can access. After creating your account, you can explore services and submit a job request.' : 'Use your real name and an active phone number. You can complete your professional profile and service details after creating your account.'}</Text>
                </View>
              )}
            </View>

            <View style={styles.authDetailsPanel}>
              <View style={styles.authSecurityLine}><Text style={styles.authSecurityIcon}>✓</Text><Text style={styles.authSecurityNote}>Locally rooted and secured.</Text></View>
              <Text style={styles.authDetailsTitle}>{authMode === 'login' ? 'Enter Details' : 'Create Account'}</Text>
              <Text style={styles.authDetailsCopy}>{authMode === 'login' ? 'Sign in to your FixIt Salone account.' : 'Create your FixIt Salone account.'}</Text>
              {authMode === 'register' && <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />}
              <Text style={styles.authFieldLabel}>Phone number</Text>
              <View style={styles.authInputRow}>
                <Text style={styles.authCountryFlag}>🇸🇱</Text>
                <Text style={styles.authCountryCode}>+232</Text>
                <TextInput value={phone} onChangeText={setPhone} placeholder="76 123 456" placeholderTextColor="#6F7B89"
                  keyboardType="phone-pad" autoCapitalize="none" autoCorrect={false} style={styles.authInput}
                  accessibilityLabel="Phone number" returnKeyType="next" />
              </View>

              <Text style={[styles.authFieldLabel, styles.authPasswordLabel]}>Password</Text>
              <View style={styles.authInputRow}>
                <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#6F7B89"
                  secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} style={styles.authInput}
                  accessibilityLabel="Password" returnKeyType="done" onSubmitEditing={signInOrRegister} />
                <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  onPress={() => setShowPassword(value => !value)} style={styles.authEyeButton}>
                  <Text style={styles.authEyeText}>{showPassword ? 'Hide' : '◉'}</Text>
                </Pressable>
              </View>
              {noticePanel}
              <Button title={busy ? 'Please wait…' : authMode === 'login' ? 'Sign in  →' : 'Create account  →'} tone="green" onPress={signInOrRegister} disabled={busy} />
              <Pressable accessibilityRole="button" onPress={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setShowPassword(false); clearMessages(); }} style={styles.authModeLinkWrap}>
                <Text style={styles.authModeLink}>{authMode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}</Text>
              </Pressable>
              <View style={styles.authGoogleDivider}><View style={styles.authGoogleDividerLine} /><Text style={styles.authGoogleOr}>OR</Text><View style={styles.authGoogleDividerLine} /></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" onPress={signInWithGoogle} disabled={busy}
                style={({ pressed }) => [styles.authGoogleButton, pressed && !busy && styles.authGoogleButtonPressed, busy && styles.authGoogleButtonDisabled]}>
                <View style={styles.authGoogleMark}><Text style={styles.authGoogleMarkText}>G</Text></View>
                <Text style={styles.authGoogleButtonText}>{busy ? 'Connecting…' : 'Continue with Google'}</Text>
              </Pressable>
            </View>
            <View style={styles.authFooter}><Text style={styles.authFooterCopy}>Trusted local services, made simpler.</Text></View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle={screen === 'home' && ['customer', 'provider'].includes(user.role) ? 'dark-content' : 'light-content'} backgroundColor={screen === 'home' && ['customer', 'provider'].includes(user.role) ? '#F5F8F6' : COLORS.navy} />
      {screen === 'home' && user.role === 'provider' ? (
        <View style={styles.homeHeader}>
          <View style={styles.homeBrandRow}>
            <View style={styles.homeLogoMark}><Text style={styles.homeLogoSymbol}>⌂</Text><View style={styles.homeLogoWindow} /></View>
            <View style={styles.homeBrandText}>
              <Text style={styles.homeBrand}><Text style={styles.homeBrandFix}>FixIt</Text><Text style={styles.homeBrandSalone}> Salone</Text></Text>
              <Text style={styles.homeGreeting}>Your Trusted Home &amp; Repair Services</Text>
            </View>
            <View style={styles.providerHeaderActionWrap}>
              <Pressable accessibilityRole="button" accessibilityLabel="Open provider notifications"
                style={styles.homeHeaderAction} onPress={loadNotifications}><BellGlyph /></Pressable>
              {notifications.some(n => !n.is_read) && (
                <View style={styles.homeHeaderBadge}>
                  <Text style={styles.homeHeaderBadgeText}>{notifications.filter(n => !n.is_read).length > 9 ? '9+' : notifications.filter(n => !n.is_read).length}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : screen === 'home' && user.role === 'customer' ? (
        <View style={styles.homeHeader}>
          <View style={styles.homeBrandRow}>
            <View style={styles.homeLogoMark}><Text style={styles.homeLogoSymbol}>⌂</Text><View style={styles.homeLogoWindow} /></View>
            <View style={styles.homeBrandText}>
              <Text style={styles.homeBrand}><Text style={styles.homeBrandFix}>FixIt</Text><Text style={styles.homeBrandSalone}> Salone</Text></Text>
              <Text style={styles.homeGreeting}>Your Trusted Home &amp; Repair Services</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open messages" style={styles.homeHeaderAction}
              onPress={() => { setScreen('inbox'); clearMessages(); }}><BellGlyph /></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{pageTitle}</Text>
        </View>
      )}

      {noticePanel}
      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent} keyboardShouldPersistTaps="handled">
        {screen === 'home' && user.role === 'customer' && <>
          <Pressable accessibilityRole="button" onPress={() => { setScreen('providers'); clearMessages(); }} style={styles.homeLocationRow}>
            <Text style={styles.homeLocationPin}>⌖</Text>
            <View style={styles.homeLocationCopy}>
              <Text style={styles.homeLocationLabel}>YOUR LOCATION</Text>
              <Text style={styles.homeLocationValue}>{districtFilter || (regionFilter === 'All' ? 'Sierra Leone' : regionFilter)}  <Text style={styles.homeLocationChevron}>⌄</Text></Text>
            </View>
          </Pressable>

          <View style={styles.homeSearchRow}>
            <Text style={styles.homeSearchIcon}>⌕</Text>
            <TextInput value={search} onChangeText={setSearch} placeholder="What service do you need?" placeholderTextColor="#8A9690"
              autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={styles.homeSearchInput}
              accessibilityLabel="Search services and providers" />
            <Pressable accessibilityRole="button" accessibilityLabel="Open provider filters" style={styles.homeFilterButton}
              onPress={() => { setScreen('providers'); clearMessages(); }}><FilterGlyph /></Pressable>
          </View>

          <ImageBackground source={activeHomeHeroSlide.image} style={styles.homePromoHero} imageStyle={styles.homeHeroImage}>
            <View pointerEvents="none" style={styles.homeHeroShade} />
            <View style={styles.homePromoCopy}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.homePromoEyebrow}>LOCAL {activeHomeHeroSlide.label.toUpperCase()} PROFESSIONALS</Text>
              <Text style={styles.homePromoTitle}>Reliable{'\n'}Professionals{'\n'}For Your Home</Text>
              <Text numberOfLines={2} style={styles.homePromoSubtitle}>Trusted local pros for your {activeHomeHeroSlide.label.toLowerCase()} job.</Text>
              <Pressable accessibilityRole="button" onPress={() => {
                setSearch(activeHomeHeroSlide.query); setRegionFilter('All'); setDistrictFilter(''); setScreen('providers'); clearMessages();
              }} style={({ pressed }) => [styles.homePromoAction, pressed && styles.buttonPressed]}>
                <Text style={styles.homePromoActionText}>Request a service  →</Text>
              </Pressable>
            </View>
            <View accessibilityLabel={`Profession ${activeHomeHeroSlide.ordinal} of ${HOME_HERO_SLIDES.length}`} style={styles.homeHeroCount}>
              <Text style={styles.homeHeroCountText}>{String(activeHomeHeroSlide.ordinal).padStart(2, '0')} / {HOME_HERO_SLIDES.length}</Text>
            </View>
          </ImageBackground>

          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Service Categories</Text>
            <Pressable accessibilityRole="button" onPress={() => { setSearch(''); setScreen('providers'); clearMessages(); }}>
              <Text style={styles.seeAllText}>See all  ›</Text>
            </Pressable>
          </View>
          <View style={styles.quickCategoryGrid}>
            {CUSTOMER_QUICK_CATEGORIES.map(category => (
              <Pressable key={category.label} accessibilityRole="button" style={({ pressed }) => [styles.quickCategoryTile, pressed && styles.categoryTilePressed]}
                onPress={() => {
                  setSearch(category.query); setRegionFilter('All'); setDistrictFilter(''); setScreen('providers'); clearMessages();
                }}>
                <View style={[styles.quickCategoryIconWrap, { backgroundColor: category.tint }]}><Text style={styles.quickCategoryIcon}>{category.symbol}</Text></View>
                <Text numberOfLines={1} style={styles.quickCategoryLabel}>{category.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>{filteredProviders.some(p => Number(p.review_count || 0) > 0) ? 'Top Rated Providers' : 'Local Providers'}</Text>
            <Pressable onPress={() => { setSearch(''); setScreen('providers'); clearMessages(); }}>
              <Text style={styles.seeAllText}>See all  ›</Text>
            </Pressable>
          </View>
          {filteredProviders.length === 0 ? (
            <View style={styles.activeJobEmpty}>
              <Text style={styles.activeJobEmptyCopy}>No providers are available for this search yet. Explore all services or try another search.</Text>
            </View>
          ) : (
            [...filteredProviders].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 3).map((p, index) => (
              <Pressable key={String(p.id) + '-' + String(p.service_id || index)} accessibilityRole="button"
                accessibilityLabel={'View ' + (p.business_name || p.full_name || 'service provider')}
                onPress={() => openProvider(p)} style={({ pressed }) => [styles.providerListCard, pressed && styles.categoryTilePressed]}>
                {p.profile_photo_url
                  ? <RemoteImage uri={p.profile_photo_url} style={styles.providerListPhoto} fallbackText={String(p.business_name || p.full_name || 'FS').slice(0, 1).toUpperCase()} />
                  : <View style={styles.providerListPhotoFallback}><Text style={styles.providerListInitial}>{String(p.business_name || p.full_name || 'FS').slice(0, 1).toUpperCase()}</Text></View>}
                <View style={styles.providerListCopy}>
                  <Text numberOfLines={1} style={styles.providerListName}>{p.business_name || p.full_name || 'Service provider'}</Text>
                  {!!Number(p.review_count || 0) && <Text style={styles.providerListRating}>★ {Number(p.rating).toFixed(1)} <Text style={styles.providerListReviews}>({Number(p.review_count)} reviews)</Text></Text>}
                  <Text numberOfLines={1} style={styles.providerListService}>{p.service_name || 'Local services'}</Text>
                  <Text numberOfLines={1} style={styles.providerListLocation}>⌖  {[p.area, p.district].filter(Boolean).join(', ') || 'Sierra Leone'}</Text>
                </View>
                <View style={styles.providerListAside}>
                  {p.verification_status === 'verified' && <View style={styles.providerListVerified}><Text style={styles.providerListVerifiedText}>✓ Verified</Text></View>}
                  <Text style={styles.providerListArrow}>›</Text>
                </View>
              </Pressable>
            ))
          )}
          {jobs.some(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)) && <>
            <View style={styles.homeSectionHeader}>
              <Text style={styles.homeSectionTitle}>Your active requests</Text>
              <Pressable onPress={() => { setScreen('requests'); loadCustomerRequests(); clearMessages(); }}><Text style={styles.seeAllText}>See all  ›</Text></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeJobsRow}>
              {jobs.filter(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)).slice(0, 4).map((job, index) => (
                <ActiveWorkCard key={String(job.id || index)} job={job} role="customer" onPress={() => { setScreen('requests'); loadCustomerRequests(); clearMessages(); }} />
              ))}
            </ScrollView>
          </>}
        </>}

        {screen === 'providers' && user.role === 'customer' && <>
          <Button title="← Back to home" secondary onPress={() => { setScreen('home'); clearMessages(); }} />
          <Text style={styles.sectionLead}>Browse available professionals and choose a service.</Text>
          <Field value={search} onChangeText={setSearch} placeholder="⌕  Search repairs or technicians..." autoCapitalize="none" />
          <OptionPicker
            label="Filter by region"
            value={regionFilter === 'All' ? 'All regions' : regionFilter}
            options={['All regions', ...REGIONS]}
            onChange={value => {
              setRegionFilter(value === 'All regions' ? 'All' : value);
              setDistrictFilter('');
            }}
          />
          <Field value={districtFilter} onChangeText={setDistrictFilter} placeholder="District filter (optional)" />
          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Service providers ({filteredProviders.length})</Text>
            <Button title="Refresh" secondary compact onPress={loadProviders} disabled={busy} />
          </View>
          {filteredProviders.length === 0 ? <Empty text="No live providers match this search yet. Try a different category or region." /> :
            filteredProviders.map((p, index) => (
              <Card key={String(p.id) + '-' + String(p.service_id || index)}>
                <View style={styles.providerCardHeader}>
                  {p.profile_photo_url
                    ? <RemoteImage uri={p.profile_photo_url} style={styles.avatarImage} fallbackText={String(p.business_name || p.full_name || 'FS').slice(0, 1).toUpperCase()} />
                    : <View style={styles.avatar}><Text style={styles.avatarText}>{String(p.business_name || p.full_name || 'FS').slice(0, 1).toUpperCase()}</Text></View>}
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{p.business_name || p.full_name || 'Service provider'}</Text>
                    <View style={styles.providerServicePill}>
                      <Text style={styles.providerServicePillText}>{p.service_name || 'Home services'}</Text>
                    </View>
                    <Text style={styles.cardMeta}>⌖  {[p.area, p.district, p.region].filter(Boolean).join(', ') || 'Sierra Leone'}</Text>
                  </View>
                  <View style={[styles.providerTrustPill, p.verification_status === 'verified' ? styles.providerTrustVerified : styles.providerTrustLocal]}>
                    <Text style={[styles.providerTrustText, p.verification_status === 'verified' ? styles.providerTrustTextVerified : styles.providerTrustTextLocal]}>
                      {p.verification_status === 'verified' ? '✓ Verified' : 'Local pro'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardDescription}>{p.service_description || 'Local FixIt Salone service professional.'}</Text>
                <Text style={styles.priceText}>{p.price_sle != null ? 'SLE ' + Number(p.price_sle).toLocaleString() : 'Request a quotation'}</Text>
                <View style={styles.buttonRow}>
                  <View style={styles.buttonRowItem}><Button title="View profile" secondary onPress={() => openProvider(p)} /></View>
                  <View style={styles.buttonRowItem}><Button title="Request service" onPress={() => startRequest(p, p)} /></View>
                </View>
              </Card>
            ))
          }
        </>}

        {screen === 'home' && user.role === 'provider' && <>
          <View style={styles.providerDashboardIntro}>
            <Text style={styles.providerDashboardTitle}>Provider dashboard</Text>
            <Text style={styles.providerDashboardLead}>Manage your business and customer work from here.</Text>
          </View>

          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Pending Requests</Text>
            <Pressable accessibilityRole="button" onPress={() => { setScreen('requests'); loadProviderDashboard(); clearMessages(); }}>
              <Text style={styles.seeAllText}>View all  ›</Text>
            </Pressable>
          </View>
          {providerPendingJobs.length === 0 ? (
            <View style={styles.providerPendingEmpty}>
              <View style={styles.emptyJobIcon}><Text style={styles.emptyJobIconText}>▤</Text></View>
              <Text style={styles.activeJobEmptyTitle}>No pending requests</Text>
              <Text style={styles.activeJobEmptyCopy}>New customer requests will appear here when they need your services.</Text>
            </View>
          ) : providerPendingJobs.slice(0, 3).map((job, index) => (
            <ProviderRequestCard key={String(job.id || index)} job={job}
              onPress={() => { setScreen('requests'); loadProviderDashboard(); clearMessages(); }} />
          ))}

          {providerActiveJobs.length > 0 && <>
            <View style={styles.homeSectionHeader}>
              <Text style={styles.homeSectionTitle}>Active Work</Text>
              <Pressable accessibilityRole="button" onPress={() => { setScreen('requests'); loadProviderDashboard(); clearMessages(); }}>
                <Text style={styles.seeAllText}>View all  ›</Text>
              </Pressable>
            </View>
            {providerActiveJobs.slice(0, 3).map((job, index) => (
              <ActiveWorkCard key={String(job.id || index)} job={job} role="provider" fullWidth
                onPress={() => { setScreen('requests'); loadProviderDashboard(); clearMessages(); }} />
            ))}
          </>}

          <Card style={styles.providerBusinessCard}>
            <Text style={styles.providerBusinessTitle}>{providerProfile?.business_name || 'Set up your provider profile'}</Text>
            <Text style={styles.providerBusinessLocation}>{providerProfile
              ? ([providerProfile.area, providerProfile.district].filter(Boolean).join(', ') || 'Business location not set')
              : 'Add your business location and main service before customers can find you.'}</Text>
            <ProviderDashboardButton title={providerProfile ? 'Edit business profile and services' : 'Set up provider profile'} onPress={openProviderSetup} />
          </Card>
          <Card style={styles.providerLaunchCard}>
            <Text style={styles.providerLaunchTitle}>Free during launch</Text>
            <Text style={styles.providerLaunchCopy}>Providers can receive and manage customer requests without referral limits or subscription fees. FixIt platform fees are waived during launch.</Text>
            <Text style={styles.providerLaunchMeta}>Customer requests received: {subscriptionInfo?.referral_count ?? jobMeta.referral_count ?? 0}</Text>
          </Card>
        </>}

        {screen === 'provider-detail' && <>
          <Button title="← Back to providers" secondary onPress={() => setScreen('home')} />
          {!providerInfo ? <ActivityIndicator size="large" color={COLORS.green} style={styles.spinner} /> : <>
            <Card>
              <View style={styles.providerProfileHero}>
                <RemoteImage
                  uri={providerInfo.profile?.profile_photo_url || selectedProvider?.profile_photo_url}
                  style={styles.profilePhoto}
                  fallbackText="No photo yet"
                />
                <View style={styles.profileIdentity}>
                  <Text style={styles.bigTitle}>{providerInfo.profile?.business_name || selectedProvider?.business_name || 'Provider profile'}</Text>
                  <Text style={styles.cardMeta}>{providerInfo.profile?.verification_status === 'verified' ? '✓ Verified provider' : 'Verification not complete'}</Text>
                  <Text style={styles.profileRating}>★ {providerInfo.rating ?? '—'} <Text style={styles.cardMeta}>({providerInfo.reviewCount ?? 0} reviews)</Text></Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>{providerInfo.profile?.service_address}</Text>
              <Text style={styles.cardMeta}>{providerInfo.profile?.area}, {providerInfo.profile?.district}, {providerInfo.profile?.region}</Text>
            </Card>
            <Text style={styles.sectionTitle}>Services and prices</Text>
            {(providerInfo.services || []).map(s => (
              <Card key={String(s.service_id)}>
                <Text style={styles.cardTitle}>{s.name}</Text>
                <Text style={styles.cardDescription}>{s.description || 'Local professional service.'}</Text>
                <Text style={styles.cardMeta}>{String(s.pricing_type || 'quote_required').replaceAll('_', ' ')}{s.price_sle != null ? ' · SLE ' + Number(s.price_sle).toLocaleString() : ''}</Text>
                <Button title="Request this service" onPress={() => startRequest({ ...selectedProvider, ...providerInfo.profile, id: selectedProvider?.id }, s)} />
              </Card>
            ))}
            <Text style={styles.sectionTitle}>Reviews</Text>
            {(providerInfo.reviews || []).length === 0 ? <Empty text="No reviews available yet." /> : providerInfo.reviews.map((r, i) =>
              <Card key={String(r.id || i)}><Text style={styles.cardTitle}>{'★'.repeat(Number(r.rating || 0))} · {r.customer_name || 'Customer'}</Text><Text style={styles.cardDescription}>{r.review_text || 'No written comment.'}</Text></Card>)}
            <Text style={styles.sectionTitle}>Portfolio</Text>
            {(providerInfo.work || []).length === 0 ? <Empty text="No portfolio items available yet." /> : providerInfo.work.map((w, i) =>
              <Card key={String(w.id || i)} style={styles.portfolioCard}>
                {String(w.media_type || '').toLowerCase().includes('image')
                  ? <Pressable onPress={() => { const uri = mediaUri(w.file_url); if (uri) Linking.openURL(uri).catch(() => setError('Could not open this portfolio image.')); }}>
                      <RemoteImage uri={w.file_url} style={styles.portfolioImage} fallbackText="Image could not be loaded" />
                    </Pressable>
                  : <View style={styles.videoPreview}><Text style={styles.videoPreviewIcon}>▶</Text><Text style={styles.videoPreviewText}>Video portfolio item</Text></View>}
                <Text style={styles.cardTitle}>{w.caption || 'Provider work'}</Text>
                <Text style={styles.cardMeta}>{w.media_type || 'Media'} · {w.created_at ? new Date(w.created_at).toLocaleDateString() : ''}</Text>
                <Button title={String(w.media_type || '').toLowerCase().includes('video') ? 'Play portfolio video' : 'Open full image'} secondary onPress={() => {
                  const uri = mediaUri(w.file_url);
                  if (uri) Linking.openURL(uri).catch(() => setError('Could not open this portfolio item.'));
                  else setError('This portfolio item has no file URL.');
                }} />
              </Card>)}
            <Button title="Report a safety concern about this provider" secondary onPress={() => { setIncidentDetails(''); setScreen('safety'); }} />
          </>}
        </>}

        {screen === 'request-form' && <>
          <Button title="← Back" secondary onPress={() => {
            if (editingRequest) { setEditingRequest(null); setScreen('requests'); }
            else setScreen('provider-detail');
          }} />
          <Text style={styles.sectionLead}>{editingRequest ? 'Edit your request for ' : 'Send a request to '}{selectedProvider?.business_name || selectedProvider?.full_name || 'this provider'}.</Text>
          <Field label="Verified contact phone (+232)" value={requestForm.contactPhone} onChangeText={v => setRequestValue('contactPhone', v)} placeholder="76 123 456" keyboardType="phone-pad" editable={!editingRequest} />
          <Text style={styles.helper}>{editingRequest ? 'Your verified phone number is fixed for this request.' : 'Use the 8-digit phone number verified on your FixIt account.'}</Text>
          <OptionPicker label="Region" value={requestForm.region} options={REGIONS}
            onChange={r => {
              setRequestValue('region', r);
              const firstDistrict = (DISTRICTS[r] || [])[0] || '';
              setRequestValue('district', firstDistrict);
            }} />
          <OptionPicker label="District" value={requestForm.district} options={DISTRICTS[requestForm.region] || []}
            onChange={d => setRequestValue('district', d)} />
          <Field label="Area / community" value={requestForm.area} onChangeText={v => setRequestValue('area', v)} placeholder="e.g. Lumley" />
          <Field label="Service address" value={requestForm.address} onChangeText={v => setRequestValue('address', v)} placeholder="Street, landmark or address" />
          <Field label="Directions (optional)" value={requestForm.directions} onChangeText={v => setRequestValue('directions', v)} placeholder="How the provider can find you" />
          <Text style={styles.fieldLabel}>Pricing arrangement</Text>
          <View style={styles.wrapChips}>
            {[['quote_required', 'Quote required'], ['starting_price', 'Starting price'], ['fixed_price', 'Fixed price']].map(([v, label]) =>
              <Chip key={v} title={label} active={requestForm.pricingType === v} onPress={() => setRequestValue('pricingType', v)} />)}
          </View>
          <Field label="Describe the job" value={requestForm.details} onChangeText={v => setRequestValue('details', v)} placeholder="Describe the work you need..." multiline />
          {!editingRequest && <>
            <Text style={styles.sectionTitle}>Add job photos <Text style={styles.optionalText}>(optional)</Text></Text>
            <Text style={styles.helper}>Show the provider what needs to be fixed. Attach up to 5 photos (10 MB max each). HEIC/HEIF photos convert to JPG automatically.</Text>
            {!pendingPhotoRequestId && <View style={styles.photoActions}>
              <View style={styles.photoActionItem}><Button title="Choose from gallery" secondary onPress={pickRequestPhotos} disabled={busy || selectedPhotos.length >= 5} /></View>
              <View style={styles.photoActionItem}><Button title="Take a photo" secondary onPress={takeRequestPhoto} disabled={busy || selectedPhotos.length >= 5} /></View>
            </View>}
            {selectedPhotos.length > 0 && <View style={styles.selectedPhotosWrap}>
              <Text style={styles.photoCount}>{selectedPhotos.length} of 5 photos selected</Text>
              <View style={styles.selectedPhotosRow}>
                {selectedPhotos.map((photo, index) => <View key={photo.uri} style={styles.selectedPhotoItem}>
                  <Image source={{ uri: photo.uri }} style={styles.selectedPhotoThumb} resizeMode="cover" />
                  {!pendingPhotoRequestId && <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setSelectedPhotos(prev => prev.filter((_, i) => i !== index))} style={styles.removePhotoButton}>
                    <Text style={styles.removePhotoText}>×</Text>
                  </Pressable>}
                  <Text style={styles.selectedPhotoLabel}>Photo {index + 1}</Text>
                </View>)}
              </View>
            </View>}
            <Text style={styles.helper}>Final price must be approved before payment. Your photos are attached to this request so the selected provider can review the job.</Text>
          </>}
          {editingRequest && <Text style={styles.helper}>You can change request details before the provider responds. Manage attached photos from View job photos.</Text>}
          <Button title={editingRequest ? (busy ? 'Saving changes…' : 'Save changes') : busy
              ? (pendingPhotoRequestId ? 'Uploading photos…' : 'Submitting…')
              : (pendingPhotoRequestId ? 'Retry photo upload' : 'Send service request')}
            onPress={editingRequest ? saveServiceRequestEdits : createServiceRequest} disabled={busy} />
        </>}

        {screen === 'job-photos' && <>
          <Button title="← Back to jobs" secondary onPress={() => setScreen('requests')} />
          <Text style={styles.sectionLead}>Photos attached to service request {jobPhotosRequestId}.</Text>
          {user.role === 'customer' && <Button title={busy ? 'Uploading photos…' : 'Add photos to this request'} secondary onPress={addPhotosToExistingRequest} disabled={busy || jobPhotos.length >= 5} />}
          {busy && jobPhotos.length === 0 ? <ActivityIndicator size="large" color={COLORS.green} style={styles.spinner} /> :
            jobPhotos.length === 0 ? <Empty text="No photos are attached to this request yet." /> :
            jobPhotos.map((photo, index) => <Card key={String(photo.id || index)}>
              <AuthenticatedRequestImage uri={photo.file_url} token={token} style={styles.jobPhotoLarge} />
              <Text style={styles.cardTitle}>{photo.original_name || 'Job photo ' + (index + 1)}</Text>
              <Text style={styles.cardMeta}>Photo {index + 1} of {jobPhotos.length}</Text>
            </Card>)}
        </>}

        {screen === 'inbox' && user.role === 'customer' && <>
          <Text style={styles.sectionLead}>Choose a service request to message its assigned provider. Your conversation history is saved with the request.</Text>
          <Card>
            <Text style={styles.cardTitle}>Job update alerts</Text>
            <Text style={styles.cardDescription}>{pushToken ? 'Push alerts are enabled on this device for quotes, messages, and job progress.' : 'Get an alert when your provider sends a quote or updates your job.'}</Text>
            {pushToken
              ? <Button title={pushBusy ? 'Updating…' : 'Disable push alerts'} secondary onPress={disablePushNotifications} disabled={pushBusy} />
              : <Button title={pushBusy ? 'Enabling…' : 'Enable job alerts'} onPress={() => registerPushNotifications(true)} disabled={pushBusy} />}
          </Card>
          {jobs.length === 0 ? <Card><Text style={styles.cardTitle}>Your message inbox</Text><Text style={styles.cardDescription}>When you request a service, you can message the assigned provider here or from My Jobs.</Text><Button title="Refresh my jobs" onPress={loadCustomerRequests} secondary /></Card> :
            jobs.filter(j => j.provider_id || j.provider_name || j.business_name).map((j, i) => <Card key={String(j.id || i)}>
              <View style={styles.cardTop}><Text style={styles.cardTitle}>{j.service_name || 'Service request'}</Text><Status value={j.status} /></View>
              <Text style={styles.cardMeta}>Provider: {j.business_name || j.provider_name || 'Assigned provider'}</Text>
              <Button title="Open conversation" onPress={() => openConversation(j.id)} />
            </Card>)}
          <Button title="Chat with FixIt Support" secondary onPress={() => { setScreen('support'); clearMessages(); }} />
        </>}

        {screen === 'conversation' && <>
          <Button title={user.role === 'provider' ? '← Back to customer jobs' : '← Back to inbox'} secondary onPress={() => setScreen(user.role === 'provider' ? 'requests' : 'inbox')} />
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Request conversation</Text><Button title="Refresh" secondary compact onPress={refreshConversation} disabled={conversationBusy} /></View>
          <Text style={styles.helper}>Service request #{conversationRequestId}. Keep payments and arrangements within trusted FixIt channels. Never share passwords or verification codes.</Text>
          {conversationBusy && conversationMessages.length === 0 ? <ActivityIndicator size="large" color={COLORS.green} style={styles.spinner} /> :
            conversationMessages.length === 0 ? <Empty text="No messages yet. Send a message to start the conversation." /> :
            conversationMessages.map((m, i) => {
              const mine = String(m.sender_user_id) === String(user.id);
              return <View key={String(m.id || i)} style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                <Text style={styles.messageSender}>{mine ? 'You' : (m.sender_name || (m.sender_role === 'provider' ? 'Provider' : 'Customer'))}</Text>
                <Text style={styles.messageBody}>{m.message_text}</Text>
                <Text style={styles.messageTime}>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</Text>
              </View>;
            })}
          <TextInput value={conversationDraft} onChangeText={setConversationDraft} placeholder="Write a message…" multiline maxLength={2000}
            style={styles.messageComposer} editable={!conversationBusy} />
          <Button title={conversationBusy ? 'Sending…' : 'Send message'} onPress={sendConversationMessage} disabled={conversationBusy || !conversationDraft.trim()} />
        </>}

        {screen === 'requests' && user.role === 'customer' && <>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your service activity</Text><Button title="Refresh" secondary compact onPress={loadCustomerRequests} disabled={busy} /></View>
          <View style={styles.customerJobSummary}>
            {[
              { label: 'Awaiting provider', count: jobs.filter(j => j.status === 'requested').length },
              { label: 'Quotes to review', count: jobs.filter(j => j.status === 'quoted').length },
              { label: 'In progress', count: jobs.filter(j => j.status === 'approved' || j.status === 'in_progress').length }
            ].map(item => (
              <View key={item.label} style={styles.customerJobSummaryCard}>
                <Text style={styles.customerJobSummaryCount}>{item.count}</Text>
                <Text style={styles.customerJobSummaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          {jobs.length === 0 ? <Empty text="You have no service requests yet. Find a provider on Home and tap Request service." /> :
            jobs.map((j, i) => (
              <Card key={String(j.id || i)}>
                <View style={styles.cardTop}><Text style={styles.cardTitle}>{j.service_name || 'Service request'}</Text><Status value={j.status} /></View>
                <JobProgressDetails status={j.status} />
                <View style={{ backgroundColor: j.status === 'requested' ? COLORS.warmPeach : j.status === 'quoted' ? COLORS.softBlue : ['approved', 'in_progress'].includes(j.status) ? COLORS.orangeLight : COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line, padding: 11, marginTop: 8, marginBottom: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.muted, letterSpacing: 0.7, marginBottom: 4 }}>NEXT ACTION</Text>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: COLORS.ink, fontWeight: '600' }}>
                    {j.status === 'requested' ? 'Review the details and photos, then send an itemized quote to the customer.' : j.status === 'quoted' ? 'Your quote has been sent. Wait for the customer to approve or respond, and stay available for messages.' : j.status === 'approved' ? 'The customer approved your quote. Contact them to agree on the start time before beginning work.' : j.status === 'in_progress' ? 'Keep the customer updated and use messages to coordinate the job.' : j.status === 'completed' ? 'This job is marked completed. Keep the conversation available in case the customer follows up.' : j.status === 'cancelled' ? 'This request was cancelled. Review the messages if you need context.' : 'Review the job details and messages for the latest update.'}
                  </Text>
                </View>
                <View style={styles.jobNextAction}>
                  <Text style={styles.jobNextActionLabel}>NEXT STEP</Text>
                  <Text style={styles.jobNextActionText}>{j.status === 'requested' ? 'Wait for a provider to respond to your request.' : j.status === 'quoted' ? 'Review the quotation and approve or decline it.' : j.status === 'approved' ? 'Your quote is approved. Coordinate the start time with your provider.' : j.status === 'in_progress' ? 'Your job is in progress. Message your provider if you need an update.' : j.status === 'completed' ? 'Job completed. Share a review of your experience.' : j.status === 'declined' ? 'This quotation was declined. You can discuss another quote with the provider.' : j.status === 'cancelled' ? 'This request is cancelled.' : 'Check the job details and contact your provider if needed.'}</Text>
                </View>
                <Text style={styles.cardMeta}>Provider: {j.business_name || j.provider_name || 'Provider'} · {j.created_at ? new Date(j.created_at).toLocaleDateString() : ''}</Text>
                <Text style={styles.cardDescription}>{j.job_details}</Text>
                <Text style={styles.cardMeta}>{j.area}, {j.district}, {j.region} · {j.service_address}</Text>
                {j.status === 'requested' && <Button title="Edit request" secondary compact onPress={() => startEditingRequest(j)} disabled={busy} />}
                {j.completion_submitted_at && !j.completion_confirmed_at && <View style={{ marginTop: 10, gap: 8 }}>
                  <Text style={styles.cardMeta}>The provider has submitted completion evidence. Review the photos before confirming.</Text>
                  <Button title="Confirm work completed" onPress={() => confirmCompletion(j.id)} disabled={busy} />
                  <Button title="Report a problem" secondary onPress={() => reportCompletionIssue(j.id)} disabled={busy} />
                </View>}
                <View style={styles.jobQuickActions}>
                  <View style={styles.jobQuickActionItem}><Button title="View job photos" secondary compact onPress={() => openJobPhotos(j.id)} /></View>
                  <View style={styles.jobQuickActionItem}><Button title="Message provider" secondary compact onPress={() => openConversation(j.id)} /></View>
                </View>
                {j.quoted_amount != null && <View style={{ backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 15, marginTop: 12, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.ink }}>Provider quotation</Text>
                    <View style={{ backgroundColor: COLORS.orangeLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.green }}>ITEMIZED</Text>
                    </View>
                  </View>
                  {[
                    ['Labour', j.labour_amount],
                    ['Materials', j.materials_amount],
                    ['Transport', j.transport_amount]
                  ].map(([label, amount]) => (
                    <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
                      <Text style={{ fontSize: 13, color: COLORS.muted }}>{label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>SLE {Number(amount || 0).toLocaleString()}</Text>
                    </View>
                  ))}
                  <View style={{ height: 1, backgroundColor: COLORS.line, marginTop: 2, marginBottom: 12 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink }}>Quote total</Text>
                      <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>Review before approving</Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.green }}>SLE {Number(j.quoted_amount).toLocaleString()}</Text>
                  </View>
                  {Number(j.platform_fee || 0) > 0 && <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 10 }}>Provider FixIt fee: SLE {Number(j.platform_fee).toLocaleString()} (shown separately from your quotation).</Text>}
                  <View style={{ marginTop: 12 }}>
                    <Button title="Download quotation PDF" secondary onPress={() => downloadQuotePdf(j)} disabled={busy} />
                  </View>
                  {j.status === 'quoted' && <Text style={{ fontSize: 12, color: COLORS.ink, marginTop: 12 }}>Check the costs above. Approve if you agree with the quotation, or decline if you do not.</Text>}
                </View>}
                {j.status === 'quoted' && <View style={styles.buttonRow}>
                  <View style={styles.buttonRowItem}><Button title="Approve quote" onPress={() => setJobStatus(j.id, 'approved')} /></View>
                  <View style={styles.buttonRowItem}><Button title="Decline" secondary onPress={() => setJobStatus(j.id, 'declined')} /></View>
                </View>}
                {j.status === 'approved' && <Card><Text style={styles.cardTitle}>Job payments coming later</Text><Text style={styles.cardDescription}>Online payments for service jobs are not enabled yet. Do not send money through this app. Payment options will be announced when available.</Text></Card>}
                {j.status === 'completed' && <Button title={reviewJobId === String(j.id) ? 'Review open below' : 'Rate provider'} secondary onPress={() => { setReviewJobId(reviewJobId === String(j.id) ? '' : String(j.id)); setReviewRating(5); setReviewText(''); }} />}
                {reviewJobId === String(j.id) && <View style={styles.reviewBox}>
                  <Text style={styles.fieldLabel}>Your rating</Text>
                  <View style={styles.wrapChips}>{[1, 2, 3, 4, 5].map(n => <Chip key={n} title={'★'.repeat(n)} active={reviewRating === n} onPress={() => setReviewRating(n)} />)}</View>
                  <Field value={reviewText} onChangeText={setReviewText} placeholder="Optional review" multiline />
                  <Button title="Submit review" onPress={() => submitReview(j.id)} disabled={busy} />
                </View>}
                {['requested', 'quoted', 'approved', 'in_progress'].includes(j.status) && <Button title="Cancel request" secondary onPress={() => setJobStatus(j.id, 'cancelled')} />}
              </Card>
            ))}
          </>}

        {screen === 'requests' && user.role === 'provider' && <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Customer jobs</Text><Button title="Refresh" secondary compact onPress={loadProviderDashboard} disabled={busy} /></View>
          <Text style={styles.helper}>Review job details and send an itemized quote before starting work. Free provider access is limited to the first three referrals; notifications may continue after that limit.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'New requests', count: jobs.filter(j => j.status === 'requested').length },
              { label: 'Quotes sent', count: jobs.filter(j => j.status === 'quoted').length },
              { label: 'In progress', count: jobs.filter(j => j.status === 'approved' || j.status === 'in_progress').length }
            ].map(item => (
              <View key={item.label} style={{ flex: 1, minWidth: 0, backgroundColor: COLORS.orangeLight, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: COLORS.line }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.green, marginBottom: 3 }}>{item.count}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.ink }}>{item.label}</Text>
              </View>
            ))}
          </View>
          {jobs.length === 0 ? <Empty text="No visible requests yet. Make sure your business profile and main service are saved." /> :
            jobs.map((j, i) => (
              <Card key={String(j.id || i)}>
                <View style={styles.cardTop}><Text style={styles.cardTitle}>{j.service_name || 'Service request'}</Text><Status value={j.status} /></View>
                <JobProgressDetails status={j.status} />
                <View style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 12, marginTop: 4, marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 4 }}>CUSTOMER</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>{j.customer_name || 'Customer'}</Text>
                  {!!j.customer_phone && <Text style={{ fontSize: 13, color: COLORS.green, marginTop: 3 }}>{j.customer_phone}</Text>}
                  <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 10 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 4 }}>JOB DESCRIPTION</Text>
                  <Text style={styles.cardDescription}>{j.job_details || 'No extra job details were provided.'}</Text>
                  <View style={{ height: 1, backgroundColor: COLORS.line, marginVertical: 10 }} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 4 }}>JOB LOCATION</Text>
                  <Text style={{ fontSize: 13, color: COLORS.ink, lineHeight: 19 }}>{[j.area, j.district, j.region].filter(Boolean).join(', ') || 'Location not provided'}</Text>
                  {!!j.service_address && <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>{j.service_address}</Text>}
                </View>
                <Button title="View attached job photos" secondary compact onPress={() => openJobPhotos(j.id)} />
                <Button title="Message customer" secondary compact onPress={() => openConversation(j.id)} />
                <Button title="Report suspicious customer" secondary compact onPress={() => {
                  setIncidentReportedUserId(String(j.customer_user_id || ''));
                  setIncidentJobId(String(j.id || ''));
                  setIncidentReason('Fraud or scam');
                  setIncidentDetails('');
                  setScreen('safety');
                  clearMessages();
                }} />
                {j.quoted_amount != null && <Text style={styles.priceText}>Quote: SLE {Number(j.quoted_amount).toLocaleString()}</Text>}
                {j.status === 'completed' && <>
                  <Button title={receiptJobId === String(j.id) ? 'Receipt form open' : 'Create payment receipt PDF'} secondary onPress={() => {
                    if (receiptJobId === String(j.id)) { setReceiptJobId(''); return; }
                    setReceiptJobId(String(j.id));
                    setReceiptAmount(String(j.quoted_amount ?? ''));
                    setReceiptMethod('Cash');
                    setReceiptReference('');
                    setReceiptConfirmed(false);
                    clearMessages();
                  }} disabled={busy} />
                  {receiptJobId === String(j.id) && <View style={styles.reviewBox}>
                    <Text style={styles.cardTitle}>Payment receipt details</Text>
                    <Text style={styles.helper}>Only issue a receipt after you have actually received payment.</Text>
                    <Field label="Amount received (SLE)" value={receiptAmount} onChangeText={setReceiptAmount} keyboardType="decimal-pad" placeholder="Enter amount received" />
                    <Field label="Payment method" value={receiptMethod} onChangeText={setReceiptMethod} placeholder="Cash, bank transfer, mobile money" />
                    <Field label="Payment reference (optional)" value={receiptReference} onChangeText={setReceiptReference} placeholder="Transaction ID or reference" />
                    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: receiptConfirmed }} onPress={() => setReceiptConfirmed(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
                      <View style={{ width: 22, height: 22, borderRadius: 5, borderWidth: 1, borderColor: receiptConfirmed ? COLORS.green : COLORS.line, backgroundColor: receiptConfirmed ? COLORS.green : COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
                        {receiptConfirmed ? <Text style={{ color: COLORS.white, fontWeight: '800' }}>✓</Text> : null}
                      </View>
                      <Text style={{ flex: 1, color: COLORS.ink, fontSize: 13 }}>I confirm I have received this payment.</Text>
                    </Pressable>
                    <Button title="Generate receipt PDF" onPress={() => createPaymentReceiptPdf(j)} disabled={busy} />
                    <Button title="Cancel" secondary onPress={() => setReceiptJobId('')} />
                  </View>}
                </>}
                {j.status === 'requested' && <>
                  <Button title="Send itemized quote" onPress={() => { setQuoteJobId(String(j.id)); setQuoteForm({ labour: '', materials: '', transport: '' }); }} />
                  {quoteJobId === String(j.id) && <View style={styles.reviewBox}>
                    <Field label="Labour (SLE)" value={quoteForm.labour} onChangeText={v => setQuoteValue('labour', v)} keyboardType="decimal-pad" placeholder="0" />
                    <Field label="Materials (SLE)" value={quoteForm.materials} onChangeText={v => setQuoteValue('materials', v)} keyboardType="decimal-pad" placeholder="0" />
                    <Field label="Transport (SLE)" value={quoteForm.transport} onChangeText={v => setQuoteValue('transport', v)} keyboardType="decimal-pad" placeholder="0" />
                    <View style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginTop: 4, marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 10 }}>Quotation preview</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                        <Text style={{ fontSize: 13, color: COLORS.muted }}>Labour</Text>
                        <Text style={{ fontSize: 13, color: COLORS.ink }}>SLE {Number(quoteForm.labour || 0).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                        <Text style={{ fontSize: 13, color: COLORS.muted }}>Materials</Text>
                        <Text style={{ fontSize: 13, color: COLORS.ink }}>SLE {Number(quoteForm.materials || 0).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, color: COLORS.muted }}>Transport</Text>
                        <Text style={{ fontSize: 13, color: COLORS.ink }}>SLE {Number(quoteForm.transport || 0).toLocaleString()}</Text>
                      </View>
                      <View style={{ height: 1, backgroundColor: COLORS.line, marginBottom: 10 }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.ink }}>Quote total</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.green }}>SLE {(Number(quoteForm.labour || 0) + Number(quoteForm.materials || 0) + Number(quoteForm.transport || 0)).toLocaleString()}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>FixIt fee is separate and is not added to the customer's quote total.</Text>
                    </View>
                    <Text style={styles.helper}>The FixIt platform fee is waived during launch. The quote total must be greater than zero.</Text>
                    <Button title="Send quote to customer" onPress={() => sendQuote(j.id)} disabled={busy} />
                    <Button title="Cancel quote" secondary onPress={() => setQuoteJobId('')} />
                  </View>}
                  <Button title="Decline request" secondary onPress={() => setJobStatus(j.id, 'declined')} />
                </>}
                {j.status === 'approved' && <Button title="Start job" onPress={() => setJobStatus(j.id, 'in_progress')} />}
                {j.status === 'in_progress' && <>
                  <Button title="Upload before-work photos" secondary onPress={() => uploadCompletionPhotos(j.id, 'before')} disabled={busy} />
                  <Button title="Upload after-work photos" secondary onPress={() => uploadCompletionPhotos(j.id, 'after')} disabled={busy} />
                  <Button title="Submit for customer confirmation" onPress={() => submitCompletion(j.id)} disabled={busy} />
                </>}
                {['requested', 'quoted', 'approved', 'in_progress'].includes(j.status) && <Button title="Cancel job" secondary onPress={() => setJobStatus(j.id, 'cancelled')} />}
              </Card>
            ))}
          <Text style={styles.helper}>Provider subscriptions are free during launch. All assigned requests remain accessible.</Text>
        </>}

        {screen === 'account' && <>
          <Card style={styles.accountSummaryCard}>
            <View style={styles.accountSummaryRow}>
              {['customer', 'provider'].includes(user.role) ? (
                <View style={styles.profilePictureColumn}>
                  <Pressable accessibilityRole="button" accessibilityLabel={profilePhotoUrl ? 'Change profile picture' : 'Upload profile picture'}
                    onPress={pickProfilePhoto} disabled={profilePhotoBusy}
                    style={({ pressed }) => [styles.profilePicturePressable, pressed && styles.buttonPressed, profilePhotoBusy && styles.disabled]}>
                    {profilePhotoUrl
                      ? <AuthenticatedRequestImage uri={profilePhotoUrl} token={token} style={styles.accountAvatarPhoto} />
                      : <View style={styles.accountAvatar}><Text style={styles.accountAvatarText}>{(user.full_name || 'F').trim().slice(0, 1).toUpperCase()}</Text></View>}
                    <View style={styles.profilePhotoCameraBadge}><Text style={styles.profilePhotoCameraIcon}>📷</Text></View>
                  </Pressable>
                  <Text style={styles.profilePhotoActionLabel}>{profilePhotoBusy ? 'Uploading…' : profilePhotoUrl ? 'Change photo' : 'Add photo'}</Text>
                </View>
              ) : (
                <View style={styles.accountAvatar}><Text style={styles.accountAvatarText}>{(user.full_name || 'F').trim().slice(0, 1).toUpperCase()}</Text></View>
              )}
              <View style={styles.accountIdentity}>
                <Text style={styles.bigTitle}>{user.full_name || 'FixIt account'}</Text>
                <Text style={styles.cardMeta}>{user.phone}</Text>
                <View style={styles.accountTypeBadge}>
                  <Text style={styles.accountTypeText}>{user.role === 'provider' ? 'SERVICE PROVIDER' : 'CUSTOMER ACCOUNT'}</Text>
                </View>
              </View>
            </View>
            {['customer', 'provider'].includes(user.role) && (
              <Button title={profilePhotoBusy ? 'Uploading photo…' : profilePhotoUrl ? 'Change profile picture' : 'Upload profile picture'}
                secondary onPress={pickProfilePhoto} disabled={profilePhotoBusy} />
            )}
          </Card>

          <View style={styles.accountSectionHeading}>
            <Text style={styles.accountSectionTitle}>Quick actions</Text>
            <Text style={styles.accountSectionSubtitle}>Manage your FixIt account</Text>
          </View>

          <View style={styles.accountGrid}>
            {user.role === 'provider' && <>
              <ActionTile icon="▣" title="Business profile" subtitle="Services and location" onPress={openProviderSetup} />
              <ActionTile icon="♧" title="Subscription" subtitle="Plans and referrals" onPress={openSubscription} />
              <ActionTile icon="✉" title="Notifications" subtitle="Provider updates" onPress={loadNotifications} />
            </>}
            {user.role === 'customer' && <ActionTile icon="▤" title="Payment records" subtitle="View payments" onPress={async () => { await loadPayments(); setScreen('payments'); }} />}
            <ActionTile icon="✓" title="Verify account" subtitle="Check verification" onPress={loadVerification} />
            <ActionTile icon="⚑" title="Safety Center" subtitle="Report an issue" onPress={() => { setScreen('safety'); clearMessages(); }} />
            <ActionTile icon="✉" title="FixIt Support" subtitle="Get help" onPress={() => { setScreen('support'); clearMessages(); }} />
            <ActionTile icon="↻" title="Refresh data" subtitle="Update latest details" onPress={refreshHomeData} disabled={busy} />
          </View>

          <Pressable accessibilityRole="button" onPress={signOut}
            style={({ pressed }) => [styles.signOutAction, pressed && styles.buttonPressed]}>
            <Text style={styles.signOutIcon}>↪</Text>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </>}

        {screen === 'provider-setup' && <>
          <Button title="← Back to dashboard" secondary onPress={() => setScreen('home')} />
          <Text style={styles.sectionLead}>Customers need a business name, location, service, and clear description to find you.</Text>
          <View style={{ backgroundColor: COLORS.orangeLight, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 5 }}>Build a profile customers can trust</Text>
            <Text style={{ fontSize: 12, color: COLORS.muted, lineHeight: 18, marginBottom: 10 }}>Complete these details so customers can understand what you do and where you work.</Text>
            {(() => {
              const essentials = [
                ['Business name', !!String(providerForm.businessName || '').trim()],
                ['Location', !!String(providerForm.area || '').trim() && !!String(providerForm.district || '').trim()],
                ['Main service', !!String(providerForm.serviceId || '').trim()],
                ['Service description', !!String(providerForm.description || '').trim()]
              ];
              const completedCount = essentials.filter(([, complete]) => complete).length;
              return <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.ink, marginBottom: 4 }}>{completedCount} of {essentials.length} profile essentials completed</Text>
                <View style={{ height: 5, borderRadius: 5, backgroundColor: '#E5E7EB', overflow: 'hidden', marginBottom: 8 }}>
                  <View style={{ height: '100%', width: (completedCount / essentials.length * 100) + '%', backgroundColor: COLORS.green, borderRadius: 5 }} />
                </View>
                {essentials.map(([label, complete]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Text style={{ width: 22, fontSize: 14, fontWeight: '800', color: complete ? COLORS.green : COLORS.muted }}>{complete ? '✓' : '○'}</Text>
                <Text style={{ fontSize: 13, color: complete ? COLORS.ink : COLORS.muted }}>{label}</Text>
              </View>
                ))}
              </>;
            })()}
          </View>
          <Field label="Business name" value={providerForm.businessName} onChangeText={v => setProviderFormValue('businessName', v)} placeholder="e.g. Joe Electrical Services" />
          <OptionPicker label="Region" value={providerForm.region} options={REGIONS}
            onChange={r => {
              setProviderFormValue('region', r);
              const firstDistrict = (DISTRICTS[r] || [])[0] || '';
              setProviderFormValue('district', firstDistrict);
            }} />
          <OptionPicker label="District" value={providerForm.district} options={DISTRICTS[providerForm.region] || []}
            onChange={d => setProviderFormValue('district', d)} />
          <Field label="Area / community" value={providerForm.area} onChangeText={v => setProviderFormValue('area', v)} placeholder="e.g. Lumley" />
          <Field label="Service address" value={providerForm.address} onChangeText={v => setProviderFormValue('address', v)} placeholder="Street, landmark or address" />
          <Text style={styles.fieldLabel}>Main service</Text>
          {services.length === 0 ? <Empty text="No services were returned by the server. Try refreshing the app." /> :
            <View style={styles.wrapChips}>
              {services.map(s => <Chip key={String(s.id)} title={s.name} active={providerForm.serviceId === String(s.id)} onPress={() => setProviderFormValue('serviceId', String(s.id))} />)}
              <Chip title="+ Other profession" active={providerForm.serviceId === '__other__'} onPress={() => setProviderFormValue('serviceId', '__other__')} />
            </View>}
          {providerForm.serviceId === '__other__' && <>
            <Field label="Profession to add" value={providerForm.otherProfession} onChangeText={v => setProviderFormValue('otherProfession', v)} placeholder="e.g. Borehole drilling" />
            <Text style={styles.helper}>We’ll review your suggestion. It becomes searchable after approval.</Text>
          </>}
          {professionSuggestions.length > 0 && <View style={{ marginTop: 14 }}>
            <Text style={styles.fieldLabel}>Profession suggestions</Text>
            {professionSuggestions.slice(0, 3).map(item => <Text key={String(item.id)} style={{ color: COLORS.muted, fontSize: 13, marginBottom: 5 }}>
              {item.requested_name} · {item.status === 'approved' ? 'Approved' : item.status === 'rejected' ? 'Not approved' : 'Waiting for review'}
            </Text>)}
          </View>}
          <Text style={styles.fieldLabel}>Pricing type</Text>
          <View style={styles.wrapChips}>
            {[['starting_price', 'Starting price'], ['fixed_price', 'Fixed price'], ['quote_required', 'Quote required']].map(([v, label]) =>
              <Chip key={v} title={label} active={providerForm.pricingType === v} onPress={() => setProviderFormValue('pricingType', v)} />)}
          </View>
          <Field label="Price in SLE (optional)" value={providerForm.price} onChangeText={v => setProviderFormValue('price', v)} keyboardType="decimal-pad" placeholder="e.g. 250" />
          <Field label="Service description" value={providerForm.description} onChangeText={v => setProviderFormValue('description', v)} placeholder="Describe the work you do" multiline />
          <Button title={busy ? 'Saving…' : 'Save business profile'} onPress={saveProviderProfile} disabled={busy} />

          <View style={styles.portfolioManageHeader}>
            <Text style={styles.sectionTitle}>Portfolio / Work samples</Text>
            <Text style={styles.helper}>Show customers photos or videos of jobs you have completed.</Text>
          </View>
          {!providerProfile?.id ? (
            <Card><Text style={styles.cardDescription}>Save your business profile first. Then reopen Business profile to add work samples.</Text></Card>
          ) : (
            <>
              <Card>
                <Button title={workAsset ? 'Choose a different photo or video' : 'Choose photo or video'} secondary onPress={pickProviderWorkAsset} disabled={workUploadBusy || busy} />
                {workAsset && (
                  <View style={styles.workAssetPreviewWrap}>
                    {workAsset.type === 'video' ? (
                      <View style={styles.workVideoPreview}><Text style={styles.workVideoIcon}>▶</Text><Text style={styles.videoPreviewText}>Video selected</Text></View>
                    ) : (
                      <Image source={{ uri: workAsset.uri }} style={styles.workAssetPreview} resizeMode="cover" />
                    )}
                    <Text style={styles.helper}>{workAsset.fileName || (workAsset.type === 'video' ? 'Selected video' : 'Selected photo')}</Text>
                  </View>
                )}
                <Field label="Work sample caption" value={workCaption} onChangeText={setWorkCaption} placeholder="e.g. Installed ceiling fan in a living room" />
                <Text style={styles.helper}>Images: JPG, PNG or WEBP. Videos: MP4 or WebM. Maximum 15 MB. A caption is required.</Text>
                <Button title={workUploadBusy ? 'Uploading…' : 'Upload to portfolio'} onPress={uploadProviderWork} disabled={workUploadBusy || busy} />
              </Card>
              <View style={styles.portfolioManageHeader}>
                <Text style={styles.sectionTitle}>Your uploaded work</Text>
                <Text style={styles.helper}>{providerWorkItems.length} {providerWorkItems.length === 1 ? 'item' : 'items'}</Text>
              </View>
              {providerWorkItems.length === 0 ? <Empty text="No work samples uploaded yet. Add your first photo or video above." /> :
                providerWorkItems.map((item, index) => (
                  <Card key={String(item.id || index)}>
                    {String(item.media_type || '').toLowerCase().includes('video') ? (
                      <View style={styles.workVideoPreview}><Text style={styles.workVideoIcon}>▶</Text><Text style={styles.videoPreviewText}>Video portfolio item</Text></View>
                    ) : (
                      <RemoteImage uri={item.file_url} style={styles.workListPhoto} fallbackText="Photo could not be loaded" />
                    )}
                    <Text style={styles.cardTitle}>{item.caption || 'Work sample'}</Text>
                    <View style={styles.workItemActions}>
                      <View style={styles.workItemActionButton}><Button title="Remove" secondary compact onPress={() => deleteProviderWork(item)} disabled={workUploadBusy} /></View>
                    </View>
                  </Card>
                ))
              }
            </>
          )}
        </>}

        {screen === 'subscription' && <>
          <Button title="← Back to dashboard" secondary onPress={() => setScreen('home')} />
          <Text style={styles.sectionLead}>Provider subscriptions are free during launch.</Text>
          <Card><Text style={styles.cardTitle}>Launch access · SLE 0</Text><Text style={styles.cardDescription}>Unlimited customer requests, assigned-job access, and provider messaging. No subscription payment or FixIt platform fee during launch.</Text></Card>
          {[
            { name: 'Pro', price: 20, description: 'Unlimited referrals and 0% FixIt transaction fee.' },
            { name: 'Business', price: 40, description: 'Pro benefits plus enhanced business visibility and provider tools as they become available.' },
            { name: 'Premium', price: 60, description: 'Business benefits plus top-tier visibility and priority benefits as they become available.' }
          ].map(p => <Card key={p.name}>
            <Text style={styles.cardTitle}>{p.name} · SLE {p.price}/month</Text>
            <Text style={styles.cardDescription}>{p.description}</Text>
            <Button title={'Request ' + p.name + ' plan'} onPress={() => requestSubscription(p.name)} disabled={busy || !!(subscriptionInfo?.payments || []).some(x => ['pending', 'processing'].includes(x.status))} />
          </Card>)}
          <Card><Text style={styles.cardTitle}>Paid plans are paused</Text><Text style={styles.cardDescription}>Subscription options are being kept for a future launch phase. You do not need to pay to receive requests or manage assigned jobs.</Text></Card>
          {subscriptionInfo && <>
            <Text style={styles.sectionTitle}>Current status</Text>
            <Card><Text style={styles.cardTitle}>{subscriptionInfo.subscription ? 'Subscription active' : 'No active paid subscription'}</Text><Text style={styles.cardMeta}>Referrals used: {subscriptionInfo.referral_count || 0} · Free referrals: {subscriptionInfo.free_referrals || 3}</Text></Card>
            <Text style={styles.sectionTitle}>Recent subscription requests</Text>
            {(subscriptionInfo.payments || []).length ? subscriptionInfo.payments.map(p => <Card key={String(p.id)}><Text style={styles.cardTitle}>{p.plan_name} · SLE {Number(p.amount_sle).toLocaleString()}</Text><Text style={styles.cardMeta}>Status: {p.status} · {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</Text></Card>) : <Empty text="No subscription payment requests recorded yet." />}
          </>}
        </>}

        {screen === 'notifications' && <>
          <Button title="← Back to dashboard" secondary onPress={() => setScreen('home')} />
          <Card>
            <Text style={styles.cardTitle}>Push alerts</Text>
            <Text style={styles.cardDescription}>{pushToken ? 'Push alerts are enabled on this device for requests, messages, and job status changes.' : 'Get an alert when a customer sends a request, message, or job update.'}</Text>
            {pushToken
              ? <Button title={pushBusy ? 'Updating…' : 'Disable push alerts'} secondary onPress={disablePushNotifications} disabled={pushBusy} />
              : <Button title={pushBusy ? 'Enabling…' : 'Enable push alerts'} onPress={() => registerPushNotifications(true)} disabled={pushBusy} />}
          </Card>
          <View style={{ backgroundColor: COLORS.orangeLight, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.ink }}>Your notifications</Text>
            <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>{notifications.filter(n => !n.is_read).length} unread · {notifications.length} total</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={{ flex: 1 }}><Button title="Refresh" secondary onPress={loadNotifications} /></View>
            {notifications.some(n => !n.is_read) && <View style={{ flex: 1 }}><Button title="Mark all as read" secondary onPress={async () => { const unread = notifications.filter(n => !n.is_read); for (const item of unread) await markNotificationRead(item.id); }} disabled={busy} /></View>}
          </View>
          {notifications.length === 0 ? <Empty text="No provider notifications found. New request and account updates will appear here." /> : notifications.map(n =>
            <Card key={String(n.id)}>
              <View style={styles.cardTop}><Text style={styles.cardTitle}>{n.title || 'Provider notification'}</Text><Status value={n.is_read ? 'read' : 'unread'} /></View>
              <Text style={styles.cardDescription}>{n.message}</Text>
              <Text style={styles.cardMeta}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</Text>
              {!n.is_read && <Button title="Mark as read" secondary onPress={() => markNotificationRead(n.id)} />}
            </Card>)}
        </>}

        {screen === 'verification' && <>
          <Button title="← Back to account" secondary onPress={() => setScreen('account')} />
          <Text style={styles.sectionLead}>Review your trust status. Identity information should stay private.</Text>
          <View style={{ backgroundColor: COLORS.orangeLight, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.ink, marginBottom: 10 }}>Your verification steps</Text>
            {[
              { number: '1', title: 'Confirm your phone number', detail: 'Receive and enter the SMS code.', done: verifyStatus?.phone_status === 'verified' },
              { number: '2', title: 'Submit your National ID', detail: 'Upload a clear photo of your National ID card and take a selfie.', done: String(verifyStatus?.identity?.status || '').toLowerCase() === 'verified' },
              { number: '3', title: 'Wait for review', detail: 'Trust & Safety reviews your submission before verification is approved.', done: String(verifyStatus?.identity?.status || '').toLowerCase() === 'verified' }
            ].map(step => (
              <View key={step.number} style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 }}>
                <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: step.done ? COLORS.green : COLORS.white, borderWidth: 1, borderColor: step.done ? COLORS.green : COLORS.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: step.done ? COLORS.white : COLORS.ink }}>{step.done ? '✓' : step.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.ink }}>{step.title}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, lineHeight: 17, marginTop: 2 }}>{step.detail}</Text>
                </View>
              </View>
            ))}
            <Text style={{ fontSize: 11, color: COLORS.muted, lineHeight: 16, marginTop: 12 }}>Never share your ID card or selfie in chat. Only upload identity documents through this verification screen.</Text>
          </View>
          {!verifyStatus ? <Button title="Load verification status" onPress={loadVerification} disabled={busy} /> : <Card>
            <Text style={styles.cardTitle}>Phone verification</Text>
            <Status value={verifyStatus.phone_status || 'unverified'} />
            <Text style={styles.cardMeta}>{verifyStatus.phone_verified_at ? 'Verified on ' + new Date(verifyStatus.phone_verified_at).toLocaleDateString() : 'Your phone has not been verified.'}</Text>
            <Text style={styles.cardTitle}>Identity verification</Text>
            <Status value={verifyStatus.identity?.status || 'unverified'} />
            <Text style={styles.cardMeta}>{verifyStatus.identity?.verified_at ? 'Verified on ' + new Date(verifyStatus.identity.verified_at).toLocaleDateString() : 'Identity verification is not complete.'}</Text>
          </Card>}
          {verifyStatus?.phone_status !== 'verified' && <Button title="Send phone verification code" onPress={requestOtp} disabled={busy} />}
          {!!verificationId && <>
            <Field label="Verification code" value={otp} onChangeText={setOtp} placeholder="Enter SMS code" keyboardType="number-pad" autoCapitalize="none" />
            <Button title="Verify phone" onPress={verifyOtp} disabled={busy} />
          </>}
          {verifyStatus?.phone_status !== 'verified' ? (
            <Card>
              <Text style={styles.cardTitle}>Phone verification required</Text>
              <Text style={styles.cardDescription}>Confirm your phone number first. Once it is verified, you can submit your identity document and a selfie here.</Text>
            </Card>
          ) : ['pending', 'under_review'].includes(String(verifyStatus?.identity?.status || '').toLowerCase()) ? (
            <Card>
              <Text style={styles.cardTitle}>Identity submission received</Text>
              <Text style={styles.cardDescription}>Your documents are waiting for Trust & Safety review. Please do not submit another copy while the review is pending.</Text>
            </Card>
          ) : String(verifyStatus?.identity?.status || '').toLowerCase() === 'verified' ? (
            <Card>
              <Text style={styles.cardTitle}>Identity verified</Text>
              <Text style={styles.cardDescription}>Your identity verification is complete.</Text>
            </Card>
          ) : verifyStatus ? (
            <Card>
              <Text style={styles.cardTitle}>Submit identity verification</Text>
              <Text style={styles.cardDescription}>Upload a clear photo of your National ID card and take a selfie. Use images no larger than 5 MB each. Do not send your identity documents in chat or support messages.</Text>
              <Text style={styles.fieldLabel}>Required identity document</Text>
              <Text style={styles.cardDescription}>National ID card only. Passports, driver's licences, and voter ID cards are not accepted.</Text>
              <Button title={identityDocumentAsset ? 'Change National ID card photo' : 'Choose National ID card photo'}
                secondary onPress={pickIdentityDocument} disabled={busy} />
              {identityDocumentAsset && <>
                <Image source={{ uri: identityDocumentAsset.uri }} style={styles.workAssetPreview} resizeMode="contain" />
                <Text style={styles.helper}>Identity document photo selected.</Text>
              </>}
              <Button title={identitySelfieAsset ? 'Retake selfie' : 'Take selfie'} onPress={takeIdentitySelfie} disabled={busy} />
              {identitySelfieAsset && <>
                <Image source={{ uri: identitySelfieAsset.uri }} style={styles.selectedPhotoThumb} resizeMode="cover" />
                <Text style={styles.helper}>Selfie selected.</Text>
              </>}
              <Button title={busy ? 'Submitting identity verification…' : 'Submit identity verification'}
                onPress={submitIdentityVerification} disabled={busy || !identityDocumentAsset || !identitySelfieAsset} />
            </Card>
          ) : null}
          <Text style={styles.helper}>Submitted identity files are encrypted by the backend for secure review. Trust & Safety must review and approve the submission; submitting documents does not mean the identity is verified. Real SMS verification requires the SMS provider to be configured on the backend.</Text>
        </>}

        {screen === 'safety' && <>
          <Button title="← Back to account" secondary onPress={() => setScreen('account')} />
          <Text style={styles.sectionLead}>Report fraud, threats, harassment, damage, or another safety concern. Your report is sent to FixIt Trust & Safety.</Text>
          {incidentJobId ? <Text style={styles.helper}>This report will be linked to request #{incidentJobId} and the customer for that job.</Text> : selectedProvider ? <Text style={styles.helper}>This report will be linked to: {selectedProvider.business_name || selectedProvider.full_name || 'selected provider'}.</Text> : null}
          <Text style={styles.fieldLabel}>Reason for report</Text>
          <View style={styles.wrapChips}>
            {['Fraud or scam', 'Threatening behaviour', 'Harassment', 'Fake identity', 'Property damage', 'Payment dispute', 'Other safety concern'].map(r =>
              <Chip key={r} title={r} active={incidentReason === r} onPress={() => setIncidentReason(r)} />)}
          </View>
          <Field label="What happened?" value={incidentDetails} onChangeText={setIncidentDetails} placeholder="Describe what happened..." multiline />
          <Button title="Submit safety report" onPress={submitSafetyReport} disabled={busy} />
          <Button title="View verification status" secondary onPress={loadVerification} />
          <Text style={styles.helper}>If anyone is in immediate danger, prioritize personal safety and contact appropriate local emergency help.</Text>
        </>}

        {screen === 'support' && <>
          <Button title="← Back to account" secondary onPress={() => setScreen('account')} />
          <View style={styles.chatLog}>
            {chatMessages.map((m, i) => <View key={String(i)} style={[styles.chatBubble, m.role === 'user' ? styles.chatUser : styles.chatAssistant]}>
              <Text style={styles.chatLabel}>{m.role === 'user' ? 'You' : 'FixIt Support'}</Text>
              <Text style={styles.chatText}>{m.content}</Text>
            </View>)}
          </View>
          <Field value={chatInput} onChangeText={setChatInput} placeholder="Ask about FixIt Salone…" multiline />
          <Button title={busy ? 'Sending…' : 'Send message'} onPress={sendSupportMessage} disabled={busy || !chatInput.trim()} />
          <Text style={styles.helper}>Do not share passwords, PINs, OTPs, or payment card details. Human support: kamarajoseph247@gmail.com · +232 31 864040.</Text>
        </>}

        {screen === 'payments' && <>
          <Button title="← Back to account" secondary onPress={() => setScreen('account')} />
          <Button title="Refresh payment records" secondary onPress={loadPayments} disabled={busy} />
          {payments.length === 0 ? <Empty text="No payment records found." /> : payments.map(p => <Card key={String(p.id)}>
            <Text style={styles.cardTitle}>{p.service_name || 'Service payment'} · SLE {Number(p.amount_sle || 0).toLocaleString()}</Text>
            <Text style={styles.cardMeta}>Provider: {p.business_name || 'Provider'}</Text>
            <Text style={styles.cardMeta}>FixIt fee: SLE {Number(p.platform_fee || 0).toLocaleString()} · Status: {p.status}</Text>
            <Text style={styles.helper}>Gateway: {p.gateway || 'not configured'} · No assumption of payment completion.</Text>
          </Card>)}
          <Text style={styles.helper}>Payment records are not proof of money received. The payment gateway must confirm any real transaction.</Text>
        </>}
      </ScrollView>

      <View style={styles.tabBar}>
        <Pressable style={[styles.tabItem, screen === 'home' && styles.tabItemActive]} onPress={() => { setScreen('home'); clearMessages(); }}>
          <Text style={[styles.tabIcon, screen === 'home' && styles.tabIconActive]}>⌂</Text>
          <Text style={[styles.tabText, screen === 'home' && styles.tabTextActive]}>Home</Text>
        </Pressable>
        <Pressable style={[styles.tabItem, screen === 'requests' && styles.tabItemActive]} onPress={() => { setScreen('requests'); clearMessages(); user.role === 'provider' ? loadProviderDashboard() : loadCustomerRequests(); }}>
          <Text style={[styles.tabIcon, screen === 'requests' && styles.tabIconActive]}>▤</Text>
          <Text style={[styles.tabText, screen === 'requests' && styles.tabTextActive]}>{user.role === 'provider' ? 'My Jobs' : 'Requests'}</Text>
        </Pressable>
        {user.role === 'customer' && <Pressable accessibilityRole="button" style={styles.tabItem}
          onPress={() => { setSearch(''); setRegionFilter('All'); setDistrictFilter(''); setScreen('providers'); clearMessages(); }}>
          <View style={styles.tabRequestCircle}><Text style={styles.tabRequestPlus}>+</Text></View>
          <Text style={styles.tabText}>Request</Text>
        </Pressable>}
        <Pressable style={[styles.tabItem, (screen === 'inbox' || screen === 'notifications') && styles.tabItemActive]} onPress={() => {
          clearMessages();
          if (user.role === 'provider') loadNotifications();
          else setScreen('inbox');
        }}>
          <View style={styles.tabIconWrap}>
            <Text style={[styles.tabIcon, (screen === 'inbox' || screen === 'notifications') && styles.tabIconActive]}>✉</Text>
            {user.role === 'provider' && notifications.some(n => !n.is_read) ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{notifications.filter(n => !n.is_read).length > 9 ? '9+' : notifications.filter(n => !n.is_read).length}</Text></View> : null}
          </View>
          <Text style={[styles.tabText, (screen === 'inbox' || screen === 'notifications') && styles.tabTextActive]}>{user.role === 'customer' ? 'Messages' : 'Inbox'}</Text>
        </Pressable>
        <Pressable style={[styles.tabItem, screen === 'account' && styles.tabItemActive]} onPress={() => { setScreen('account'); clearMessages(); loadProfilePhoto(token, user.role); }}>
          <View style={[styles.profileTabAvatar, screen === 'account' && styles.profileTabAvatarActive]}>
            {profilePhotoUrl
              ? <AuthenticatedRequestImage uri={profilePhotoUrl} token={token} style={styles.profileTabPhoto} />
              : <Text style={styles.profileTabAvatarText}>{(user.full_name || 'U').trim().slice(0, 1).toUpperCase()}</Text>}
          </View>
          <Text style={[styles.tabText, screen === 'account' && styles.tabTextActive]}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashRoot: { flex: 1, overflow: 'hidden', backgroundColor: '#FFF9F1' },
  splashTopGlow: { position: 'absolute', top: -115, alignSelf: 'center', width: '135%', height: 340, borderRadius: 230, backgroundColor: '#FFD0A8' },
  splashBottomGlow: { position: 'absolute', bottom: -130, alignSelf: 'center', width: '150%', height: 350, borderRadius: 240, backgroundColor: '#FFC18D' },
  splashContent: { flex: 1, paddingHorizontal: 22, paddingTop: Platform.OS === 'android' ? 10 : 20, paddingBottom: Platform.OS === 'android' ? 10 : 18, justifyContent: 'space-between', alignItems: 'center' },
  splashBrandArea: { width: '100%', alignItems: 'center', paddingTop: 7 },
  splashToolMark: { width: 112, height: 92, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  splashWrench: { position: 'absolute', fontSize: 67, transform: [{ rotate: '-39deg' }], left: 5, top: 5 },
  splashHammer: { position: 'absolute', fontSize: 66, transform: [{ rotate: '41deg' }], right: 1, top: 9 },
  splashWordmark: { fontSize: 38, fontWeight: '900', letterSpacing: -1.25, textAlign: 'center' },
  splashWordmarkNavy: { color: '#0F172A' },
  splashWordmarkOrange: { color: '#E87722' },
  splashIllustrationArea: { width: '100%', maxWidth: 390, flex: 1, maxHeight: 410, minHeight: 250, alignItems: 'center', justifyContent: 'center', marginVertical: 7 },
  splashHalo: { position: 'absolute', width: '88%', height: '83%', borderRadius: 220, backgroundColor: '#DCFCE7', opacity: 0.63 },
  splashIllustrationRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: 8, marginVertical: 4 },
  splashIllustrationRowMiddle: { marginVertical: 1 },
  splashIconTile: { width: '26%', aspectRatio: 0.98, borderRadius: 20, borderWidth: 1.4, borderColor: '#0F172A12', alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 7, elevation: 2 },
  splashIconLarge: { fontSize: 42, textAlign: 'center' },
  splashToolboxTile: { backgroundColor: '#FED7AA' },
  splashTechTile: { backgroundColor: '#E0F2FE' },
  splashLightTile: { backgroundColor: '#FEF3C7' },
  splashToolTile: { backgroundColor: '#F1F5F9' },
  splashCleanTile: { backgroundColor: '#FEE2E2' },
  splashPaintTile: { backgroundColor: '#FEF3C7' },
  splashSolarTile: { backgroundColor: '#DCFCE7' },
  splashHomeTile: { width: '31%', aspectRatio: 0.98, borderRadius: 24, backgroundColor: '#FFF7ED', borderWidth: 2, borderColor: '#E87722', alignItems: 'center', justifyContent: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  splashHouseIcon: { fontSize: 67, lineHeight: 79, textAlign: 'center' },
  splashHomeWindow: { position: 'absolute', right: 12, bottom: 14, width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 2, padding: 2, backgroundColor: '#1E3A8A', borderRadius: 2 },
  splashHomeWindowPane: { width: 7, height: 7, backgroundColor: '#BAE6FD', borderRadius: 1 },
  splashMiniIcon: { position: 'absolute', bottom: 9, fontSize: 10, letterSpacing: 1, color: '#1E3A8A', fontWeight: '900' },
  splashOrbitToolOne: { position: 'absolute', top: '22%', left: 0, width: 33, height: 33, borderRadius: 17, backgroundColor: '#FFFFFF88', alignItems: 'center', justifyContent: 'center' },
  splashOrbitToolTwo: { position: 'absolute', bottom: '20%', right: -1, width: 35, height: 35, borderRadius: 18, backgroundColor: '#FFFFFF88', alignItems: 'center', justifyContent: 'center' },
  splashOrbitIcon: { color: '#1E3A8A', fontSize: 23 },
  splashTagline: { color: '#0F172A', fontSize: 21, lineHeight: 29, fontWeight: '500', textAlign: 'center', paddingHorizontal: 3, marginTop: 5 },
  splashLoadingArea: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 9 },
  splashDotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 26, marginBottom: 16 },
  splashDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E87722' },
  splashProgressTrack: { width: '72%', height: 7, borderRadius: 5, backgroundColor: '#E8D4C0', overflow: 'hidden' },
  splashProgressFill: { height: '100%', borderRadius: 5, backgroundColor: '#E87722' },
  splashFooter: { width: '100%', alignItems: 'center', paddingBottom: 1 },
  splashFooterPowered: { color: '#0F172A', fontSize: 12, textAlign: 'center' },
  splashFooterCompany: { color: '#0F172A', fontSize: 12, textAlign: 'center', marginTop: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.pale, paddingTop: Platform.OS === 'android' ? 3 : 32, paddingBottom: Platform.OS === 'android' ? 44 : 0 },
  authSafe: { flex: 1, backgroundColor: '#F2F7F4', paddingTop: Platform.OS === 'android' ? 3 : 32, paddingBottom: Platform.OS === 'android' ? 8 : 0 },
  authScreen: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, backgroundColor: '#F2F7F4' },
  authBrandHeader: { alignItems: 'center', paddingTop: 3, paddingBottom: 13 },
  authHouseMark: { width: 62, height: 49, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 1 },
  authRoofLeft: { position: 'absolute', width: 34, height: 7, borderRadius: 4, backgroundColor: '#096A50', left: 2, top: 16, transform: [{ rotate: '-43deg' }] },
  authRoofRight: { position: 'absolute', width: 34, height: 7, borderRadius: 4, backgroundColor: '#096A50', right: 1, top: 16, transform: [{ rotate: '43deg' }] },
  authHouseBody: { width: 30, height: 19, backgroundColor: '#096A50', alignItems: 'center', justifyContent: 'center' },
  authHouseWindow: { width: 10, height: 10, backgroundColor: '#F0B832', borderWidth: 1, borderColor: '#FFF3C4' },
  authBrandTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -0.9 },
  authBrandGreen: { color: '#096A50' },
  authBrandDark: { color: '#182B25' },
  authTagline: { color: '#46524E', fontSize: 13, lineHeight: 18, marginTop: 3, textAlign: 'center' },
  authWelcomePanel: { position: 'relative', overflow: 'hidden', backgroundColor: '#075C46', borderRadius: 25, paddingHorizontal: 18, paddingTop: 19, paddingBottom: 15, shadowColor: '#063F31', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 3 },
  authScenicHouse: { position: 'absolute', width: 118, height: 91, right: 4, top: 8, opacity: 0.18, alignItems: 'center', justifyContent: 'flex-end' },
  authScenicRoofLeft: { position: 'absolute', width: 67, height: 12, borderRadius: 5, backgroundColor: '#C7E5D3', left: 4, top: 26, transform: [{ rotate: '-39deg' }] },
  authScenicRoofRight: { position: 'absolute', width: 67, height: 12, borderRadius: 5, backgroundColor: '#C7E5D3', right: 2, top: 26, transform: [{ rotate: '39deg' }] },
  authScenicHome: { width: 82, height: 49, backgroundColor: '#C7E5D3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingTop: 11 },
  authScenicWindow: { width: 16, height: 20, backgroundColor: '#075C46', borderWidth: 2, borderColor: '#E3F1E7' },
  authWelcomeTitle: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', letterSpacing: -0.55 },
  authWelcomeCopy: { color: '#E0F0E7', fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 12 },
  authRoleRow: { flexDirection: 'row', gap: 9 },
  authOnboardingHint: { marginTop: 9, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0F7F2', borderWidth: 1, borderColor: '#DCEBE0' },
  authOnboardingHintTitle: { color: COLORS.ink, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  authOnboardingHintCopy: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  authRoleChoice: { flex: 1, minWidth: 0, minHeight: 104, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 17, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 3, borderWidth: 1.5, borderColor: '#36836D', backgroundColor: 'rgba(0, 48, 36, 0.24)' },
  authRoleChoiceActive: { backgroundColor: '#F4F8F5', borderColor: '#FFFFFF' },
  authPeopleIcon: { width: 30, height: 26, justifyContent: 'flex-end', alignItems: 'center' },
  authPeopleHeads: { flexDirection: 'row', width: 25, justifyContent: 'space-between', paddingHorizontal: 2 },
  authPersonHead: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E7F4EB' },
  authPersonActive: { backgroundColor: '#075C46' },
  authPeopleBodies: { flexDirection: 'row', width: 30, justifyContent: 'space-between', marginTop: 1 },
  authPersonBody: { width: 14, height: 9, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#E7F4EB' },
  authHardHat: { width: 30, height: 26, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 3 },
  authHardHatDome: { width: 21, height: 13, borderTopLeftRadius: 12, borderTopRightRadius: 12, backgroundColor: '#E7F4EB' },
  authHardHatStripe: { width: 3, height: 10, position: 'absolute', top: 4, backgroundColor: '#075C46' },
  authHardHatStripeActive: { backgroundColor: '#F4F8F5' },
  authHardHatBrim: { width: 29, height: 4, borderRadius: 3, backgroundColor: '#E7F4EB' },
  authRoleTextWrap: { width: '100%', minWidth: 0, paddingRight: 12 },
  authRoleArrow: { position: 'absolute', right: 9, top: 38, color: '#DAEEE2', fontSize: 26, lineHeight: 29, fontWeight: '400' },
  authRoleArrowActive: { color: '#075C46' },
  authRolePressed: { opacity: 0.82 },
  authRoleTitle: { color: '#F3F7F4', fontSize: 13, fontWeight: '900' },
  authRoleTitleActive: { color: '#1D2924' },
  authRoleSubtitle: { color: '#DBEAE0', fontSize: 10, lineHeight: 14, marginTop: 4 },
  authRoleSubtitleActive: { color: '#394842' },
  authDetailsPanel: { backgroundColor: COLORS.white, marginTop: 12, borderRadius: 25, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 14, borderWidth: 1, borderColor: '#E4ECE6', shadowColor: '#163B2D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  authSecurityLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  authSecurityIcon: { color: '#FFFFFF', backgroundColor: '#087253', overflow: 'hidden', fontSize: 11, fontWeight: '900', textAlign: 'center', width: 16, height: 16, lineHeight: 16, borderRadius: 6 },
  authSecurityNote: { color: '#5D6963', fontSize: 11, fontWeight: '700' },
  authDetailsTitle: { color: '#172923', fontSize: 25, fontWeight: '900', letterSpacing: -0.6, marginBottom: 1 },
  authDetailsCopy: { color: '#68736D', fontSize: 13, marginBottom: 15 },
  authFieldLabel: { color: '#1D2924', fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 1 },
  authInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: 13, backgroundColor: '#FBFCFB', borderWidth: 1, borderColor: '#DDE5E0', paddingHorizontal: 11 },
  authCountryFlag: { fontSize: 22, marginRight: 8 },
  authCountryCode: { color: '#26342E', fontSize: 14, fontWeight: '700', marginRight: 8 },
  authInput: { flex: 1, minWidth: 0, color: '#1C2923', fontSize: 15, paddingVertical: 10 },
  authPhoneIcon: { color: COLORS.muted, fontSize: 20, marginLeft: 7 },
  authPasswordLabel: { marginTop: 7 },
  authEyeButton: { paddingHorizontal: 5, paddingVertical: 7, marginLeft: 4 },
  authEyeText: { color: '#69766F', fontSize: 15, fontWeight: '800' },
  authModeLinkWrap: { alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 12, marginTop: 1 },
  authModeLink: { color: '#08694F', fontSize: 13, fontWeight: '800', textDecorationLine: 'underline', textAlign: 'center' },
  authGoogleDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1, marginBottom: 11 },
  authGoogleDividerLine: { flex: 1, height: 1, backgroundColor: '#E7ECE8' },
  authGoogleOr: { color: '#7A8580', fontSize: 11, fontWeight: '700' },
  authGoogleButton: { minHeight: 49, borderRadius: 13, borderWidth: 1, borderColor: '#DCE4DF', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#163B2D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  authGoogleButtonPressed: { backgroundColor: '#F6F9F7' },
  authGoogleButtonDisabled: { opacity: 0.65 },
  authGoogleMark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  authGoogleMarkText: { color: '#4285F4', fontSize: 20, fontWeight: '900' },
  authGoogleButtonText: { color: '#25312C', fontSize: 13, fontWeight: '700' },
  authFooter: { alignItems: 'center', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 },
  authFooterCopy: { color: '#59665F', fontSize: 10, marginTop: 1 },
  authFootnote: { color: COLORS.muted, fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 12, lineHeight: 15 },
  brandMark: { alignSelf: 'center', width: 68, height: 68, borderRadius: 23, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 13, elevation: 5 },

  brandIcon: { color: COLORS.white, fontSize: 42, fontWeight: '700', marginTop: -5 },

  brand: { fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1.1 },

  tagline: { textAlign: 'center', color: COLORS.muted, marginTop: 8, marginBottom: 25, fontSize: 15, lineHeight: 21 },

  authCard: { backgroundColor: COLORS.white, borderRadius: 26, padding: 21, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 18, elevation: 2 },

  heading: { fontSize: 26, fontWeight: '900', color: COLORS.ink, letterSpacing: -0.7 },

  subheading: { color: COLORS.muted, lineHeight: 22, marginTop: 6, marginBottom: 18, fontSize: 14 },

  header: { backgroundColor: COLORS.navy, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 19, borderBottomLeftRadius: 23, borderBottomRightRadius: 23, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  pageHeader: { minHeight: 68, backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 9 : 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E9ECEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageHeaderTitle: { color: COLORS.navy, fontSize: 23, fontWeight: '900', letterSpacing: -0.55, flex: 1 },
  providerDashboardIntro: { marginBottom: 4 },
  providerDashboardTitle: { color: '#173B72', fontSize: 23, fontWeight: '900', letterSpacing: -0.55 },
  providerDashboardLead: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  providerHeaderActionWrap: { position: 'relative' },
  homeHeaderBadge: { position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: '#D64545', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F5F8F6' },
  homeHeaderBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },

  homeHeader: { backgroundColor: '#F5F8F6', paddingTop: Platform.OS === 'android' ? 8 : 13, paddingBottom: 8, paddingHorizontal: 18 },
  homeBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  homeLogoMark: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#E6F2EB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFE2D5' },
  homeLogoSymbol: { fontSize: 32, lineHeight: 39, fontWeight: '900', color: '#087253', marginTop: -4 },
  homeLogoWindow: { position: 'absolute', width: 7, height: 7, backgroundColor: '#E8B93D', right: 12, bottom: 11, borderWidth: 1, borderColor: '#FFF5D2' },
  homeBrandText: { flex: 1 },
  homeBrand: { fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  homeBrandFix: { color: '#087253' },
  homeBrandSalone: { color: '#1D2924' },
  homeGreeting: { color: '#5E6C65', fontSize: 11, fontWeight: '600', marginTop: 2 },
  homeHeaderAction: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: '#DCE6DF', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  bellGlyph: { width: 20, height: 22, alignItems: 'center', justifyContent: 'flex-start' },
  bellDome: { width: 15, height: 16, borderWidth: 1.8, borderColor: '#314139', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 5, borderBottomRightRadius: 5 },
  bellBase: { width: 19, height: 2.5, borderRadius: 2, backgroundColor: '#314139', marginTop: -1 },
  bellClapper: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#314139', marginTop: 1 },
  homeLocationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, paddingTop: 5, paddingBottom: 9, gap: 9 },
  homeLocationPin: { color: '#087253', fontSize: 22, fontWeight: '900' },
  homeLocationCopy: { flex: 1 },
  homeLocationLabel: { color: '#7A8780', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  homeLocationValue: { color: '#26342E', fontSize: 12, fontWeight: '800', marginTop: 1 },
  homeLocationChevron: { color: '#087253', fontSize: 15 },
  homeSearchRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E9E4', paddingHorizontal: 12, marginBottom: 12, shadowColor: '#172923', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 6, elevation: 1 },
  homeSearchIcon: { color: '#25352D', fontSize: 25, lineHeight: 29, marginRight: 8 },
  homeSearchInput: { flex: 1, minWidth: 0, color: '#26342E', fontSize: 13, paddingVertical: 10 },
  homeFilterButton: { width: 37, height: 34, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E6ECE8', marginLeft: 5 },
  filterGlyph: { width: 21, height: 20, justifyContent: 'space-evenly' },
  filterTrack: { height: 2, width: 18, backgroundColor: '#5B6962', borderRadius: 2, alignItems: 'flex-start', justifyContent: 'center' },
  filterKnobLeft: { width: 5, height: 5, borderRadius: 3, borderWidth: 1.5, borderColor: '#5B6962', backgroundColor: '#FFFFFF', marginLeft: 4 },
  filterKnobRight: { width: 5, height: 5, borderRadius: 3, borderWidth: 1.5, borderColor: '#5B6962', backgroundColor: '#FFFFFF', marginLeft: 11 },
  filterKnobCenter: { width: 5, height: 5, borderRadius: 3, borderWidth: 1.5, borderColor: '#5B6962', backgroundColor: '#FFFFFF', marginLeft: 7 },
  homeSectionHeading: { marginTop: 12, marginBottom: 12 },
  homeSectionTitle: { color: '#1D2924', fontSize: 18, fontWeight: '900', letterSpacing: -0.35 },
  homePromoHero: { height: 220, overflow: 'hidden', borderRadius: 21, padding: 17, marginBottom: 11, backgroundColor: '#075C46', position: 'relative', justifyContent: 'center', shadowColor: '#063F31', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 9, elevation: 3 },
  homeHeroImage: { borderRadius: 21 },
  homeHeroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3, 48, 37, 0.26)' },
  homeHeroCount: { position: 'absolute', right: 12, bottom: 12, zIndex: 2, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(3, 48, 37, 0.65)' },
  homeHeroCountText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  homePromoCopy: { width: '58%', minWidth: 0, paddingRight: 3, zIndex: 1 },
  homePromoEyebrow: { color: '#D2F0DF', fontSize: 8, fontWeight: '900', letterSpacing: 0.9, marginBottom: 8 },
  homePromoTitle: { color: COLORS.white, fontSize: 22, lineHeight: 24, fontWeight: '900', letterSpacing: -0.35 },
  homePromoSubtitle: { color: '#F0F8F3', fontSize: 11, lineHeight: 15, marginTop: 7 },
  homePromoAction: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 10, backgroundColor: '#F4F8F5', paddingHorizontal: 12, paddingVertical: 9 },
  homePromoActionText: { color: '#075C46', fontSize: 10, fontWeight: '900' },
  homepageSlidesWrap: { width: '100%', marginBottom: 17, borderRadius: 22, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 9, elevation: 2 },
  homepageSlideImage: { width: '100%', height: 165, backgroundColor: COLORS.card },
  homepageSlideDots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.35)', zIndex: 2 },
  homepageSlideDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)' },
  homepageSlideDotActive: { width: 19, backgroundColor: COLORS.orange },
  homeSearchHeading: { marginTop: 7, marginBottom: 10, paddingHorizontal: 3 },
  homeSearchHint: { color: COLORS.deepNavy, fontSize: 12, fontWeight: '900', letterSpacing: 0.15 },
  categoryCarouselWrap: { width: '100%', marginBottom: 9 },
  categoryCarouselPage: { paddingHorizontal: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 2 },
  categoryTile: { width: '23.7%', alignItems: 'center', marginBottom: 12, borderRadius: 16, paddingHorizontal: 4, paddingTop: 5, paddingBottom: 7, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.045, shadowRadius: 5, elevation: 1 },
  categoryTilePressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  quickCategoryGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 2 },
  quickCategoryTile: { width: '23.6%', alignItems: 'center', marginBottom: 10, borderRadius: 15, paddingTop: 8, paddingBottom: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9EFEB' },
  quickCategoryIconWrap: { width: '84%', aspectRatio: 1.15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickCategoryIcon: { fontSize: 27, color: '#087253', fontWeight: '900' },
  quickCategoryLabel: { color: '#26342E', textAlign: 'center', fontWeight: '700', fontSize: 9, lineHeight: 12, marginTop: 5, paddingHorizontal: 2 },
  categoryArt: { width: '100%', aspectRatio: 1.05, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E1E9F3' },
  categorySymbol: { fontSize: 29 },
  categoryLabel: { color: COLORS.navy, textAlign: 'center', fontWeight: '800', fontSize: 10, lineHeight: 13, marginTop: 6, minHeight: 28 },
  categoryDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 2, paddingBottom: 2 },
  categoryDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBD5E1' },
  categoryDotActive: { width: 13, backgroundColor: COLORS.orange },
  bookNowButton: { height: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.deepNavy, borderRadius: 16, marginTop: 3, marginBottom: 17, shadowColor: COLORS.deepNavy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 3 },
  bookNowText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
  bookNowArrow: { color: COLORS.white, fontSize: 19, marginLeft: 9, marginTop: -1 },
  homeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  seeAllText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  activeJobEmpty: { backgroundColor: COLORS.white, borderRadius: 18, paddingVertical: 20, paddingHorizontal: 17, alignItems: 'center', borderWidth: 1, borderColor: COLORS.line, marginBottom: 11 },
  emptyJobIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyJobIconText: { fontSize: 20, color: COLORS.orange },
  activeJobEmptyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  activeJobEmptyCopy: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  activeJobsRow: { paddingRight: 4, paddingBottom: 4 },
  activeJobCard: { width: 330, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, marginRight: 11, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 7, elevation: 1 },
  activeJobCardFullWidth: { width: '100%', alignSelf: 'stretch', marginRight: 0, marginBottom: 10 },
  providerRequestCard: { width: '100%', alignSelf: 'stretch', backgroundColor: COLORS.white, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#DCE7E1', shadowColor: '#173B72', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 7, elevation: 1 },
  providerRequestTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  providerRequestIcon: { width: 66, height: 66, borderRadius: 15, backgroundColor: '#F5EFE4', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  providerRequestIconText: { fontSize: 30 },
  providerRequestCopy: { flex: 1, minWidth: 0 },
  providerRequestService: { color: '#173B72', fontSize: 16, fontWeight: '900' },
  providerRequestBadge: { alignSelf: 'flex-start', backgroundColor: '#E2F6E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, marginTop: 5 },
  providerRequestBadgeText: { color: '#087253', fontSize: 11, fontWeight: '900' },
  providerRequestCustomer: { color: COLORS.ink, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 7 },
  providerRequestLocation: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  providerRequestDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, marginBottom: 3 },
  providerRequestDateIcon: { color: COLORS.muted, fontSize: 17 },
  providerRequestDate: { color: COLORS.muted, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  providerDashboardButton: { minHeight: 48, backgroundColor: '#1688E9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  providerDashboardButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  providerPendingEmpty: { backgroundColor: COLORS.white, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#DCE7E1', marginBottom: 12 },
  providerBusinessCard: { borderColor: '#DCE7E1', borderRadius: 18, padding: 16 },
  providerBusinessTitle: { color: '#173B72', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  providerBusinessLocation: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  providerLaunchCard: { borderColor: '#DCE7E1', borderRadius: 18, padding: 16 },
  providerLaunchTitle: { color: '#173B72', fontSize: 18, fontWeight: '900' },
  providerLaunchCopy: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  providerLaunchMeta: { color: COLORS.muted, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 9 },
  activeJobTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobIllustration: { width: 72, height: 72, borderRadius: 11, backgroundColor: '#F1EDE5', alignItems: 'center', justifyContent: 'center' },
  jobIllustrationText: { fontSize: 29 },
  activeJobSummary: { flex: 1 },
  activeJobTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  activeJobStatus: { color: COLORS.muted, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  activeJobStatusValue: { color: COLORS.green, fontWeight: '900', textTransform: 'capitalize' },
  activeJobProvider: { color: COLORS.ink, fontSize: 10, fontWeight: '700', marginTop: 5 },
  activeJobMeta: { color: COLORS.muted, fontSize: 9, fontWeight: '600', marginTop: 3 },
  activeJobProgressHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 1 },
  activeJobProgressLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  activeJobProgressStage: { color: COLORS.navy, fontSize: 10, fontWeight: '900' },
  requestProgressWrap: { backgroundColor: COLORS.pale, borderRadius: 13, padding: 11, marginTop: 10, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  requestProgressHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 5 },
  requestProgressTitle: { color: COLORS.navy, fontSize: 11, fontWeight: '900' },
  requestProgressValue: { flexShrink: 1, color: COLORS.orangeDark, fontSize: 10, fontWeight: '900', textAlign: 'right' },
  requestProgressStages: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 2 },
  requestProgressStage: { flex: 1, alignItems: 'center', gap: 4 },
  requestProgressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1', borderWidth: 1, borderColor: '#CBD5E1' },
  requestProgressDotDone: { backgroundColor: COLORS.deepNavy, borderColor: COLORS.deepNavy },
  requestProgressDotCurrent: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.orange, borderColor: COLORS.orange, marginTop: -1 },
  requestProgressStageLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '700', textAlign: 'center', lineHeight: 11 },
  requestProgressStageLabelDone: { color: COLORS.navy, fontWeight: '900' },
  progressTerminal: { marginTop: 8, marginBottom: 8, borderRadius: 10, backgroundColor: '#FEE2E2', paddingHorizontal: 11, paddingVertical: 9 },
  progressTerminalLabel: { color: '#991B1B', fontSize: 11, fontWeight: '800' },
  activeJobFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 9 },
  activeJobDate: { flex: 1, color: COLORS.muted, fontSize: 9, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: COLORS.card, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.deepNavy },
  jobDetailButton: { borderWidth: 1, borderColor: '#F6CDAE', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, marginTop: 10, backgroundColor: COLORS.orangeLight },
  jobDetailButtonText: { color: COLORS.orangeDark, fontSize: 12, fontWeight: '800' },
  providerCarousel: { paddingBottom: 4, paddingRight: 4 },
  providerListCard: { width: '100%', minHeight: 84, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 17, padding: 10, marginBottom: 9, borderWidth: 1, borderColor: '#E7ECE9', shadowColor: '#20352A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 6, elevation: 1 },
  providerListPhoto: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#EAF2ED' },
  providerListPhotoFallback: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#E4EFE8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D4E2D8' },
  providerListInitial: { color: '#087253', fontSize: 22, fontWeight: '900' },
  providerListCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  providerListName: { color: '#1D2924', fontSize: 12, fontWeight: '900' },
  providerListRating: { color: '#A86900', fontSize: 10, fontWeight: '900', marginTop: 2 },
  providerListReviews: { color: '#78837D', fontWeight: '600' },
  providerListService: { color: '#5C6862', fontSize: 10, marginTop: 3 },
  providerListLocation: { color: '#7C8781', fontSize: 9, marginTop: 2 },
  providerListAside: { alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 54, marginLeft: 5 },
  providerListVerified: { borderRadius: 10, backgroundColor: '#E5F4EB', paddingHorizontal: 6, paddingVertical: 4 },
  providerListVerifiedText: { color: '#087253', fontSize: 8, fontWeight: '900' },
  providerListArrow: { color: '#78857E', fontSize: 23, lineHeight: 25 },
  homeProviderCard: { width: 196, backgroundColor: COLORS.white, borderRadius: 20, padding: 12, marginRight: 12, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 9, elevation: 2 },
  homeProviderPhoto: { width: '100%', height: 112, borderRadius: 15, backgroundColor: COLORS.card, marginBottom: 10 },
  homeProviderPhotoFallback: { width: '100%', height: 112, borderRadius: 15, backgroundColor: COLORS.orangeLight, marginBottom: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  homeProviderInitial: { color: COLORS.deepNavy, fontSize: 29, fontWeight: '900' },
  homeProviderName: { color: COLORS.ink, fontSize: 14, fontWeight: '900', letterSpacing: -0.15 },
  homeProviderService: { color: COLORS.deepNavy, fontSize: 11, fontWeight: '800', marginTop: 4 },
  homeProviderVerified: { alignSelf: 'flex-start', backgroundColor: COLORS.orangeLight, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4, marginTop: 7 },
  homeProviderVerifiedText: { color: COLORS.deepNavy, fontSize: 8, fontWeight: '900', letterSpacing: 0.2 },
  homeProviderLocation: { color: COLORS.muted, fontSize: 10, marginTop: 7 },
  homeProviderPriceRow: { marginTop: 4, marginBottom: 4, padding: 8, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line },
  homeProviderPrice: { color: COLORS.deepNavy, fontSize: 12, fontWeight: '900' },
  homeProviderPriceLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '600', marginTop: 2 },
  tabIconWrap: { position: 'relative', minWidth: 26, alignItems: 'center' },
  tabBadge: { position: 'absolute', top: -4, right: -9, backgroundColor: COLORS.orange, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  profileTabAvatar: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: '#F6CDAE', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  profileTabAvatarActive: { borderColor: COLORS.orange, borderWidth: 2 },
  profileTabAvatarText: { color: COLORS.orangeDark, fontSize: 10, fontWeight: '900' },
  inboxIllustration: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orangeLight, marginBottom: 11 },
  inboxIllustrationText: { fontSize: 25, color: COLORS.orange },
  messageBubble: { maxWidth: '92%', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  messageBubbleMine: { alignSelf: 'flex-end', backgroundColor: COLORS.lightGreen },
  messageBubbleOther: { alignSelf: 'flex-start', backgroundColor: COLORS.white },
  messageSender: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginBottom: 4 },
  messageBody: { fontSize: 15, lineHeight: 21, color: COLORS.ink },
  messageTime: { fontSize: 10, color: COLORS.muted, marginTop: 6, textAlign: 'right' },
  messageComposer: { minHeight: 82, maxHeight: 150, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, fontSize: 15, color: COLORS.ink, backgroundColor: COLORS.white, textAlignVertical: 'top', marginBottom: 10 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  headerLogoIcon: { fontSize: 29, color: COLORS.white, marginTop: -2, fontWeight: '800' },
  headerBrand: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  headerSmall: { color: '#CBD5E1', marginTop: 3, fontSize: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, backgroundColor: '#1E293B', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#334155' },
  roleBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.65 },
  roleBadgeArrow: { color: COLORS.orange, fontSize: 13, fontWeight: '900' },
  badgePressed: { opacity: 0.8 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', marginTop: 17, letterSpacing: -0.5 },
  mainScroll: { flex: 1 },
  mainContent: { paddingHorizontal: 16, paddingTop: 17, paddingBottom: 25 },
  sectionLead: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
  headingSmall: { fontSize: 18, color: COLORS.ink, fontWeight: '800' },
  sectionTitle: { fontSize: 18, color: COLORS.ink, fontWeight: '900', marginTop: 15, marginBottom: 9, letterSpacing: -0.25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 7, marginBottom: 3 },
  marketHero: { backgroundColor: COLORS.navy, borderRadius: 22, padding: 19, marginBottom: 17, overflow: 'hidden', borderWidth: 1, borderColor: '#163B5B' },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  heroLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7DDBA4' },
  heroEyebrow: { color: '#A5DAB9', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: COLORS.white, fontSize: 25, fontWeight: '900', lineHeight: 30, letterSpacing: -0.6, maxWidth: 290 },
  heroCopy: { color: '#D3DEE8', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 300 },
  heroStats: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#35516A', marginTop: 17, paddingTop: 13 },
  heroStat: { flex: 1 },
  heroStatNumber: { color: COLORS.white, fontSize: 21, fontWeight: '900' },
  heroStatLabel: { color: '#C5D2DE', fontSize: 10, marginTop: 2, fontWeight: '700' },
  heroStatDivider: { height: 32, width: 1, backgroundColor: '#35516A', marginHorizontal: 13 },
  fieldWrap: { marginBottom: 11 },
  fieldLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '800', marginBottom: 6, letterSpacing: 0.15 },
  pickerTrigger: { minHeight: 49, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerValue: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  pickerPlaceholder: { color: '#98A2B3', fontWeight: '400' },
  pickerChevron: { color: COLORS.orange, fontSize: 23, fontWeight: '800', marginLeft: 12, marginTop: -4 },
  pickerPressed: { opacity: 0.78, backgroundColor: COLORS.orangeLight },
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22, backgroundColor: 'rgba(12,35,64,0.45)' },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject },
  pickerSheet: { width: '100%', maxWidth: 420, maxHeight: '78%', backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.line, elevation: 10, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.ink, paddingHorizontal: 4, paddingTop: 3, paddingBottom: 12 },
  pickerOptions: { flexGrow: 0 },
  pickerOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.card },
  pickerOptionSelected: { backgroundColor: COLORS.orangeLight, borderBottomColor: '#F6CDAE' },
  pickerOptionText: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  pickerOptionTextSelected: { color: COLORS.orangeDark, fontWeight: '900' },
  pickerCheck: { color: COLORS.orange, fontSize: 18, fontWeight: '900', marginLeft: 12 },
  pickerCancel: { marginTop: 10, minHeight: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  pickerCancelText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, color: COLORS.ink, minHeight: 49 },
  textArea: { minHeight: 108, paddingTop: 12 },
  optionalText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  photoActions: { flexDirection: 'row', gap: 8, alignItems: 'stretch', marginBottom: 8 },
  photoActionItem: { flex: 1 },
  selectedPhotosWrap: { backgroundColor: COLORS.card, borderRadius: 15, borderWidth: 1, borderColor: COLORS.line, padding: 10, marginTop: 2, marginBottom: 8 },
  photoCount: { color: COLORS.ink, fontSize: 12, fontWeight: '800', marginBottom: 9 },
  selectedPhotosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  selectedPhotoItem: { width: 88, marginBottom: 2 },
  selectedPhotoThumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  selectedPhotoLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  removePhotoButton: { position: 'absolute', right: -5, top: -5, width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  removePhotoText: { color: COLORS.white, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  button: { backgroundColor: COLORS.orange, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 7, marginBottom: 3, minHeight: 46, shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 2 },
  buttonGreen: { backgroundColor: '#087253', shadowColor: '#087253', shadowOpacity: 0.16, minHeight: 49, borderRadius: 13 },
  buttonGreenText: { color: '#FFFFFF', fontSize: 14, letterSpacing: 0.2 },
  buttonSecondary: { backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: '#F6CDAE', shadowOpacity: 0, elevation: 0 },
  buttonCompact: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 0, marginBottom: 0, minHeight: 34 },
  buttonText: { color: COLORS.white, fontWeight: '900', fontSize: 13, textAlign: 'center', letterSpacing: 0.1 },
  buttonSecondaryText: { color: COLORS.orangeDark },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  buttonRowItem: { flex: 1 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  chip: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 13, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: COLORS.white, marginRight: 7, marginBottom: 7 },
  chipActive: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  chipPressed: { opacity: 0.78 },
  chipText: { color: COLORS.muted, fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: COLORS.orangeDark },
  horizontalChips: { marginVertical: 7, flexGrow: 0 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  card: { backgroundColor: COLORS.white, borderRadius: 19, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.035, shadowRadius: 10, elevation: 1 },
  accountSummaryCard: { paddingVertical: 17, marginBottom: 14 },
  accountSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  accountAvatar: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: '#F6CDAE' },
  profilePictureColumn: { width: 76, alignItems: 'center', flexShrink: 0 },
  profilePicturePressable: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accountAvatarPhoto: { width: 64, height: 64, borderRadius: 24, backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: '#F6CDAE' },
  profilePhotoCameraBadge: { position: 'absolute', width: 24, height: 24, borderRadius: 12, right: -1, bottom: -1, borderWidth: 2, borderColor: COLORS.white, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  profilePhotoCameraIcon: { fontSize: 11 },
  profilePhotoActionLabel: { color: COLORS.orangeDark, fontSize: 10, fontWeight: '900', marginTop: 5, textAlign: 'center' },
  profileTabPhoto: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.orangeLight },
  accountAvatarText: { color: COLORS.orangeDark, fontSize: 25, fontWeight: '900' },
  accountIdentity: { flex: 1, minWidth: 0 },
  accountTypeBadge: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: COLORS.orangeLight },
  accountTypeText: { color: COLORS.orangeDark, fontSize: 9, fontWeight: '900', letterSpacing: 0.45 },
  accountSectionHeading: { marginTop: 2, marginBottom: 11 },
  accountSectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  accountSectionSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 8 },
  accountTile: { width: '48.5%', minHeight: 104, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, padding: 12, justifyContent: 'space-between', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.025, shadowRadius: 7, elevation: 1 },
  accountTilePressed: { borderColor: '#F6CDAE', backgroundColor: '#FFF7F0' },
  accountTileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  accountTileIconWrap: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orangeLight },
  accountTileIcon: { color: COLORS.orangeDark, fontSize: 18, fontWeight: '900' },
  accountTileArrow: { color: '#9BA6B0', fontSize: 15, fontWeight: '800' },
  accountTileTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  accountTileSubtitle: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  signOutAction: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#F0CECE', backgroundColor: '#FFF8F8', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 8 },
  signOutIcon: { color: COLORS.red, fontSize: 18, fontWeight: '900' },
  signOutText: { color: COLORS.red, fontSize: 13, fontWeight: '900' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 },
  providerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  providerServicePill: { alignSelf: 'flex-start', backgroundColor: COLORS.softBlue, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5, marginBottom: 3 },
  providerServicePillText: { color: COLORS.deepNavy, fontSize: 10, fontWeight: '800' },
  providerTrustPill: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' },
  providerTrustVerified: { backgroundColor: '#E8F7EE' },
  providerTrustLocal: { backgroundColor: '#F0F4F9' },
  providerTrustText: { fontSize: 10, fontWeight: '900' },
  providerTrustTextVerified: { color: '#168044' },
  providerTrustTextLocal: { color: '#63738A' },
  avatarImage: { width: 54, height: 54, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
  providerProfileHero: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 14 },
  profilePhoto: { width: 94, height: 94, borderRadius: 25, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  profileIdentity: { flex: 1, minWidth: 0 },
  profileRating: { color: '#A66A00', fontSize: 14, fontWeight: '900', marginTop: 8 },
  imagePlaceholder: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center', padding: 5, overflow: 'hidden' },
  imagePlaceholderText: { color: COLORS.muted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  portfolioCard: { overflow: 'hidden' },
  portfolioManageHeader: { marginTop: 18, marginBottom: 8, gap: 3 },
  workAssetPreviewWrap: { marginTop: 8, marginBottom: 9 },
  workAssetPreview: { width: '100%', height: 190, borderRadius: 14, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  workVideoPreview: { minHeight: 112, borderRadius: 14, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', padding: 18, marginBottom: 8 },
  workVideoIcon: { color: COLORS.orange, fontSize: 30, fontWeight: '900' },
  workListPhoto: { width: '100%', height: 180, borderRadius: 13, backgroundColor: COLORS.card, marginBottom: 10 },
  workItemActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  workItemActionButton: { width: 112 },
  portfolioImage: { width: '100%', height: 220, borderRadius: 14, marginBottom: 13, backgroundColor: COLORS.card },
  jobPhotoLarge: { width: '100%', height: 245, borderRadius: 14, backgroundColor: COLORS.card, marginBottom: 10 },
  videoPreview: { height: 160, borderRadius: 14, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  videoPreviewIcon: { color: COLORS.white, fontSize: 30, fontWeight: '900' },
  videoPreviewText: { color: '#C9D8E4', fontSize: 12, fontWeight: '800', marginTop: 6 },
  grow: { flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F6CDAE' },
  avatarText: { color: COLORS.orangeDark, fontSize: 19, fontWeight: '900' },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  bigTitle: { color: COLORS.ink, fontSize: 23, fontWeight: '900', marginBottom: 5, letterSpacing: -0.5 },
  cardMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  cardDescription: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 9 },
  priceText: { color: COLORS.orangeDark, fontSize: 15, fontWeight: '900', marginTop: 9 },
  verified: { color: COLORS.green, fontSize: 10, fontWeight: '900' },
  status: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.line },
  jobNextAction: { backgroundColor: COLORS.orangeLight, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, padding: 11, marginTop: 10, marginBottom: 10 },
  jobNextActionLabel: { color: COLORS.deepNavy, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  jobNextActionText: { color: COLORS.ink, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  jobQuickActions: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  jobQuickActionItem: { flex: 1, minWidth: 0 },
  customerJobSummary: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  customerJobSummaryCard: { flex: 1, minWidth: 0, backgroundColor: COLORS.orangeLight, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: COLORS.line },
  customerJobSummaryCount: { fontSize: 22, fontWeight: '900', color: COLORS.deepNavy, marginBottom: 3 },
  customerJobSummaryLabel: { fontSize: 10, lineHeight: 14, fontWeight: '700', color: COLORS.ink },
  statusText: { color: COLORS.ink, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  empty: { color: COLORS.muted, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 30, lineHeight: 21, backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line, overflow: 'hidden' },
  helper: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginVertical: 8 },
  spinner: { paddingVertical: 40 },
  message: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: COLORS.line },
  messageError: { backgroundColor: '#FEF3F2' },
  messageSuccess: { backgroundColor: COLORS.lightGreen },
  messageText: { flex: 1, color: COLORS.green, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  errorText: { color: COLORS.red },
  messageClose: { color: COLORS.muted, fontSize: 20, paddingHorizontal: 4 },
  fieldFoot: { fontSize: 11, color: COLORS.muted },
  footnote: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 16, lineHeight: 17 },
  reviewBox: { backgroundColor: COLORS.card, borderRadius: 15, padding: 13, marginTop: 9, borderWidth: 1, borderColor: COLORS.line },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#E5ECE8', paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 18 : 8, paddingHorizontal: 6, minHeight: Platform.OS === 'android' ? 70 : 74, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 14 },
  tabItem: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRadius: 15, marginHorizontal: 1 },
  tabItemActive: { backgroundColor: '#F0F6F2' },
  tabIcon: { color: '#84918B', fontSize: 21, lineHeight: 24, fontWeight: '800', marginBottom: 1 },
  tabIconActive: { color: '#087253' },
  tabRequestCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#087253', marginTop: -19, marginBottom: 1, borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#075C46', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.16, shadowRadius: 4, elevation: 4 },
  tabRequestPlus: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '400', marginTop: -2 },
  tabText: { color: '#64716A', fontSize: 9, fontWeight: '800' },
  tabTextActive: { color: '#087253', fontWeight: '900' },
  chatLog: { backgroundColor: COLORS.card, borderRadius: 17, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  chatBubble: { borderRadius: 13, padding: 12, marginVertical: 4, maxWidth: '92%' },
  chatUser: { alignSelf: 'flex-end', backgroundColor: COLORS.orangeLight },
  chatAssistant: { alignSelf: 'flex-start', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  chatLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '900', marginBottom: 4 },
  chatText: { color: COLORS.ink, fontSize: 14, lineHeight: 20 }
});
