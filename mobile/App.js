import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Image, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl || 'https://fixit-salone-api.onrender.com').replace(/\/$/, '');
const COLORS = {
  navy: '#0F172A',
  deepNavy: '#1E3A8A',
  orange: '#E87722',
  orangeDark: '#E06A1C',
  orangeLight: '#FFF1E7',
  green: '#16834A',
  pale: '#F9FAFB',
  card: '#F1F5F9',
  ink: '#0F172A',
  muted: '#64748B',
  line: '#E2E8F0',
  white: '#FFFFFF',
  red: '#B42318',
  lightGreen: '#DCFCE7',
  amber: '#9A6700',
  softBlue: '#E0F2FE',
  warmPeach: '#FEF3C7',
  paleGreen: '#DCFCE7',
  lightPink: '#FEE2E2'
};
const HOME_CATEGORIES = [
  { label: 'Plumbing', symbol: '🔧', query: 'plumbing', tint: '#E0F2FE' },
  { label: 'Electrical', symbol: '💡', query: 'electrical', tint: '#FEF3C7' },
  { label: 'General Home', symbol: '🏠', query: 'home', tint: '#DCFCE7' },
  { label: 'Roofing', symbol: '🪜', query: 'roofing', tint: '#FEF3C7' },
  { label: 'Appliance Repair', symbol: '🧊', query: 'appliance repair', tint: '#F1F5F9' },
  { label: 'Emergency Services', symbol: '🚨', query: 'emergency', tint: '#FEE2E2' },
  { label: 'IT & Computer', symbol: '💻', query: 'computer', tint: '#E0F2FE' },
  { label: 'Cleaning', symbol: '🧹', query: 'cleaning', tint: '#DCFCE7' },
  { label: 'Carpentry', symbol: '🪚', query: 'carpentry', tint: '#FEF3C7' },
  { label: 'Painting', symbol: '🖌️', query: 'painting', tint: '#FEE2E2' },
  { label: 'Pest Control', symbol: '🪲', query: 'pest control', tint: '#E0F2FE' },
  { label: 'Moving & Delivery', symbol: '🚚', query: 'moving', tint: '#F1F5F9' },
  { label: 'Beauty & Grooming', symbol: '💇', query: 'beauty', tint: '#FEE2E2' },
  { label: 'AC & Refrigerator', symbol: '❄️', query: 'refrigerator', tint: '#E0F2FE' },
  { label: 'Generator Repair', symbol: '⚡', query: 'generator', tint: '#FEF3C7' },
  { label: 'CCTV & Security', symbol: '📹', query: 'cctv', tint: '#F1F5F9' },
  { label: 'Welding & Metal Work', symbol: '🧑‍🏭', query: 'welding', tint: '#FEF3C7' },
  { label: 'Solar & Inverter', symbol: '🔋', query: 'solar', tint: '#DCFCE7' },
  { label: 'Tiling & Masonry', symbol: '🧱', query: 'tiling', tint: '#F1F5F9' },
  { label: 'Auto Repair', symbol: '🚗', query: 'auto repair', tint: '#E0F2FE' },
  { label: 'Landscaping & Gardening', symbol: '🌿', query: 'landscaping', tint: '#DCFCE7' },
  { label: 'Water Tank & Well', symbol: '🚰', query: 'water tank', tint: '#E0F2FE' }
];
const CATEGORY_PAGE_SIZE = 6;
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

function Button({ title, onPress, secondary = false, disabled = false, compact = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.button, secondary && styles.buttonSecondary, compact && styles.buttonCompact, disabled && styles.disabled, pressed && !disabled && styles.buttonPressed]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}
function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#98A2B3"
        secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize}
        multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.textArea]} />
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

function ActiveWorkCard({ job, role, onPress }) {
  const progress = getWorkProgress(job.status);
  const isCustomer = role === 'customer';
  const partner = isCustomer
    ? (job.business_name || job.provider_name || 'Waiting for provider')
    : (job.customer_name || 'Customer');
  const area = [job.area, job.district].filter(Boolean).join(', ');
  const date = job.created_at ? new Date(job.created_at).toLocaleDateString() : '';

  return (
    <View style={styles.activeJobCard}>
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

function AuthRoleChoice({ active, title, subtitle, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={({ pressed }) => [styles.authRoleChoice, active && styles.authRoleChoiceActive, pressed && styles.authRolePressed]}>
      <Text style={[styles.authRoleTitle, active && styles.authRoleTitleActive]}>{title}</Text>
      <Text style={[styles.authRoleSubtitle, active && styles.authRoleSubtitleActive]}>{subtitle}</Text>
    </Pressable>
  );
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
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profilePhotoBusy, setProfilePhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [homepageSlides, setHomepageSlides] = useState([]);
  const [homepageSlideIndex, setHomepageSlideIndex] = useState(0);
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
  const [providerWorkItems, setProviderWorkItems] = useState([]);
  const [workAsset, setWorkAsset] = useState(null);
  const [workCaption, setWorkCaption] = useState('');
  const [workUploadBusy, setWorkUploadBusy] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [requestForm, setRequestForm] = useState({
    region: 'Western Area', district: 'Western Area Urban', area: '', address: '', directions: '', details: '', pricingType: 'quote_required'
  });
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [pendingPhotoRequestId, setPendingPhotoRequestId] = useState('');
  const [jobPhotos, setJobPhotos] = useState([]);
  const [jobPhotosRequestId, setJobPhotosRequestId] = useState('');
  const [providerForm, setProviderForm] = useState({
    businessName: '', region: 'Western Area', district: 'Western Area Urban', area: '', address: '',
    serviceId: '', pricingType: 'starting_price', price: '', description: ''
  });
  const [quoteJobId, setQuoteJobId] = useState('');
  const [quoteForm, setQuoteForm] = useState({ labour: '', materials: '', transport: '' });
  const [reviewJobId, setReviewJobId] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [verifyStatus, setVerifyStatus] = useState(null);
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [incidentReason, setIncidentReason] = useState('Fraud or scam');
  const [incidentDetails, setIncidentDetails] = useState('');
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
        if (data.user.role === 'customer') await loadCustomerProfilePhoto(savedToken);
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
  function reportError(e) {
    const message = e?.message || 'Something went wrong. Please try again.';
    setError(message);
    setNotice('');
    return message;
  }
  function clearMessages() { setError(''); setNotice(''); }
  async function loadCustomerProfilePhoto(accessToken = token) {
    if (!accessToken) { setProfilePhotoUrl(''); return; }
    try {
      const response = await expoFetch(API_BASE + '/api/customer/profile-photo', {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load profile photo.');
      const photoUrl = data.authenticated_photo_url || data.photo_url || ''; // Use the authenticated file endpoint first; the image component adds the bearer token.
      setProfilePhotoUrl(photoUrl);
      return photoUrl || null;
    } catch (e) {
      setProfilePhotoUrl('');
      return null;
    }
  }
  async function pickProfilePhoto() {
    if (user?.role !== 'customer') {
      setError('Profile photo upload is available for customer accounts right now.');
      return;
    }
    if (profilePhotoBusy) return;
    clearMessages();
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
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
      // Expo SDK 57 expects a File object in multipart FormData, not the legacy
      // React Native { uri, name, type } object. Use the picked file directly
      // rather than copying it to a temporary path that may not exist on Android.
      const uploadFile = new File(asset.uri);
      const form = new FormData();
      form.append('photo', uploadFile, uploadName);
      setProfilePhotoBusy(true);
      const uploadResponse = await expoFetch(API_BASE + '/api/customer/profile-photo', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form
      });
      const data = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(data.error || 'Unable to upload profile photo.');
      // Re-read the saved URL from the server to avoid showing a stale local upload path.
      const visiblePhotoUrl = await loadCustomerProfilePhoto(token);
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
      await SecureStore.setItemAsync('fixit-salone-session-token', data.token);
      setToken(data.token);
      setUser(data.user);
      setRole(data.user.role);
      setScreen('home');
      setPassword('');
      if (data.user.role === 'customer') await loadCustomerProfilePhoto(data.token);
      else setProfilePhotoUrl('');
      setNotice(registering ? 'Your FixIt Salone account has been created.' : 'You are signed in.');
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
    let cancelled = false;
    async function loadHomepageSlides() {
      try {
        const response = await expoFetch(API_BASE + '/api/site-images');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) return;
        const rows = Array.isArray(data.images) ? data.images : [];
        const keyed = new Map(rows.map(item => [item.image_key, item]));
        const slides = [1, 2, 3, 4, 5, 6]
          .map(number => keyed.get('homepage-slide-' + number))
          .filter(item => item?.image_url)
          .map(item => ({ key: item.image_key, uri: mediaUri(item.image_url) }));
        if (!slides.length) {
          const hero = keyed.get('homepage-hero');
          if (hero?.image_url) slides.push({ key: hero.image_key, uri: mediaUri(hero.image_url) });
        }
        if (!cancelled) { setHomepageSlides(slides); setHomepageSlideIndex(0); }
      } catch (_) { if (!cancelled) setHomepageSlides([]); }
    }
    loadHomepageSlides();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (screen !== 'home' || homepageSlides.length < 2) return;
    const timer = setInterval(() => setHomepageSlideIndex(index => (index + 1) % homepageSlides.length), 5000);
    return () => clearInterval(timer);
  }, [screen, homepageSlides.length]);

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
    setSelectedProvider(provider);
    setSelectedPhotos([]);
    setPendingPhotoRequestId('');
    setSelectedServiceId(String(service.service_id || service.id || provider.service_id || ''));
    setRequestForm({
      region: provider.region || 'Western Area', district: provider.district || 'Western Area Urban',
      area: provider.area || '', address: provider.service_address || '', directions: '', details: '',
      pricingType: service.pricing_type || provider.pricing_type || 'quote_required'
    });
    setScreen('request-form');
    clearMessages();
  }
  function addPickedPhotos(assets) {
    const current = selectedPhotos.slice();
    const combined = [...current];
    let tooLarge = false;
    let unsupported = false;
    for (const asset of assets || []) {
      if (!asset?.uri) continue;
      const type = String(asset.mimeType || 'image/jpeg').toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) { unsupported = true; continue; }
      if (asset.fileSize != null && asset.fileSize > 10 * 1024 * 1024) { tooLarge = true; continue; }
      if (combined.some(photo => photo.uri === asset.uri)) continue;
      if (combined.length >= 5) break;
      combined.push({ ...asset, mimeType: type });
    }
    setSelectedPhotos(combined.slice(0, 5));
    if (tooLarge) setError('A photo was skipped because it is larger than 10 MB. Please choose a smaller image.');
    else if (unsupported) setError('Only JPG, PNG, and WEBP photos are supported.');
    else clearMessages();
    if (assets?.length && combined.length === current.length && !tooLarge && !unsupported) {
      setNotice('You can attach up to 5 photos to a request.');
    }
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
        quality: 0.75
      });
      if (!result.canceled) addPickedPhotos(result.assets || []);
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
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 });
      if (!result.canceled) addPickedPhotos(result.assets || []);
    } catch (e) {
      setError(e?.message || 'Could not open the camera.');
    }
  }

  async function uploadRequestPhotos(requestId) {
    const form = new FormData();
    selectedPhotos.forEach((photo, index) => {
      const type = String(photo.mimeType || 'image/jpeg').toLowerCase();
      const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const sourceFile = new File(photo.uri);
      const uploadName = 'fixit-request-' + String(requestId) + '-' + String(index + 1) + '-' + Date.now() + '.' + ext;
      const uploadFile = new File(Paths.cache, uploadName);
      sourceFile.copy(uploadFile);
      form.append('photos', uploadFile);
    });
    return api('/api/service-requests/' + encodeURIComponent(requestId) + '/photos', {
      method: 'POST',
      body: form
    });
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
          directions: requestForm.directions.trim(), pricing_type: requestForm.pricingType,
          job_details: requestForm.details.trim()
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
    if (!providerForm.businessName.trim() || !providerForm.region.trim() || !providerForm.district.trim() ||
        !providerForm.area.trim() || !providerForm.address.trim() || !providerForm.serviceId) {
      setError('Complete your business name, location and main service.'); return;
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
      await api('/api/providers/me/services', {
        method: 'POST',
        body: JSON.stringify({
          service_id: providerForm.serviceId, pricing_type: providerForm.pricingType,
          price_sle: providerForm.price.trim() ? Number(providerForm.price) : null,
          description: providerForm.description.trim()
        })
      });
      setProviderProfile(saved.profile);
      setNotice('Your provider profile and main service have been saved. You can now add work samples below.');
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
        quality: 0.8,
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
        if (result.user.role === 'customer') await loadCustomerProfilePhoto(result.token);
        else setProfilePhotoUrl('');
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
          reported_user_id: selectedProvider?.user_id || null,
          reason: incidentReason, details: incidentDetails.trim()
        })
      });
      setIncidentDetails('');
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
    SecureStore.deleteItemAsync('fixit-salone-session-token').catch(() => {});
    setToken(''); setUser(null); setScreen('auth'); setAuthMode('login'); setPassword('');
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

  const noticePanel = error || notice ? (
    <View style={[styles.message, error ? styles.messageError : styles.messageSuccess]}>
      <Text style={[styles.messageText, error && styles.errorText]}>{error || notice}</Text>
      <Pressable onPress={clearMessages}><Text style={styles.messageClose}>×</Text></Pressable>
    </View>
  ) : null;

  if (showSplash) {
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
              <View style={styles.authBrandTop}>
                <View style={styles.authBrandCopy}>
                  <Text style={styles.authBrandTitle}><Text style={styles.authBrandGold}>FixIt</Text><Text style={styles.authBrandWhite}> Salone</Text></Text>
                  <Text style={styles.authTagline}>Trusted local services, made simpler.</Text>
                </View>
                <View style={styles.authShield}><Text style={styles.authShieldText}>⌂</Text><Text style={styles.authShieldCheck}>✓</Text></View>
              </View>
            </View>

            <View style={styles.authWelcomePanel}>
              <Text style={styles.authWelcomeTitle}>{authMode === 'login' ? 'Welcome back' : 'Join FixIt Salone'}</Text>
              <Text style={styles.authWelcomeCopy}>Choose how you want to use FixIt Salone.</Text>
              <View style={styles.authRoleRow}>
                <AuthRoleChoice active={role === 'customer'} title="Customer" subtitle="Find services, book jobs" onPress={() => setRole('customer')} />
                <AuthRoleChoice active={role === 'provider'} title="Service provider" subtitle="Offer services, manage jobs" onPress={() => setRole('provider')} />
              </View>
            </View>

            <View style={styles.authDetailsPanel}>
              <Text style={styles.authSecurityNote}>Locally rooted and secured.</Text>
              <Text style={styles.authDetailsTitle}>{authMode === 'login' ? 'Enter Details' : 'Create Account'}</Text>
              {authMode === 'register' && <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />}
              <Text style={styles.authFieldLabel}>Phone number</Text>
              <View style={styles.authInputRow}>
                <Text style={styles.authCountryFlag}>🇸🇱</Text>
                <Text style={styles.authCountryCode}>+232</Text>
                <TextInput value={phone} onChangeText={setPhone} placeholder="76 123 456" placeholderTextColor="#6F7B89"
                  keyboardType="phone-pad" autoCapitalize="none" autoCorrect={false} style={styles.authInput}
                  accessibilityLabel="Phone number" returnKeyType="next" />
                <Text style={styles.authPhoneIcon}>☎</Text>
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
              <Button title={busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} onPress={signInOrRegister} disabled={busy} />
              <Button title={authMode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'} secondary onPress={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setShowPassword(false); clearMessages(); }} />
              <Text style={styles.authFootnote}>We prioritize your privacy and local security.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      {screen === 'home' && user.role === 'customer' ? (
        <View style={styles.homeHeader}>
          <View style={styles.homeBrandRow}>
            <View style={styles.homeLogoMark}><Text style={styles.homeLogoSymbol}>🔧</Text></View>
            <View style={styles.homeBrandText}>
              <Text style={styles.homeBrand}><Text style={styles.homeBrandFix}>FixIt</Text><Text style={styles.homeBrandSalone}> Salone</Text></Text>
              <Text style={styles.homeGreeting}>Welcome, {(user.full_name || 'there').split(' ')[0]}!</Text>
            </View>
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
          {homepageSlides.length > 0 && <View style={styles.homepageSlidesWrap}>
            <Image source={{ uri: homepageSlides[Math.min(homepageSlideIndex, homepageSlides.length - 1)]?.uri }} style={styles.homepageSlideImage} resizeMode="cover" />
            {homepageSlides.length > 1 && <View style={styles.homepageSlideDots}>
              {homepageSlides.map((slide, index) => <Pressable key={slide.key} accessibilityRole="button" accessibilityLabel={'Show homepage slide ' + (index + 1)} onPress={() => setHomepageSlideIndex(index)} style={[styles.homepageSlideDot, index === homepageSlideIndex && styles.homepageSlideDotActive]} />)}
            </View>}
          </View>}
          <Field value={search} onChangeText={setSearch} placeholder="⌕  Search repairs or technicians..." autoCapitalize="none" />

          <View style={styles.homeSectionHeading}>
            <Text style={styles.homeSectionTitle}>Quick Categories</Text>
          </View>
          <View style={styles.categoryCarouselWrap}
            onLayout={event => {
              const width = event.nativeEvent.layout.width;
              if (width > 0 && Math.abs(width - categoryCarouselWidth) > 1) setCategoryCarouselWidth(width);
            }}>
            <ScrollView
              ref={categoryCarouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={event => {
                if (categoryCarouselWidth > 0) {
                  const page = Math.round(event.nativeEvent.contentOffset.x / categoryCarouselWidth);
                  if (page !== categoryPageIndex) setCategoryPageIndex(page);
                }
              }}
            >
              {CATEGORY_PAGES.map((page, pageIndex) => (
                <View key={'category-page-' + pageIndex} style={[styles.categoryCarouselPage, { width: categoryCarouselWidth || '100%' }]}>
                  <View style={styles.categoryGrid}>
                    {page.map(category => (
                      <Pressable key={category.label} accessibilityRole="button"
                        onPress={() => {
                          setSearch(category.query);
                          setRegionFilter('All');
                          setDistrictFilter('');
                          setScreen('providers');
                          clearMessages();
                        }}
                        style={({ pressed }) => [styles.categoryTile, pressed && styles.categoryTilePressed]}>
                        <View style={[styles.categoryArt, { backgroundColor: category.tint }]}>
                          <Text style={styles.categorySymbol}>{category.symbol}</Text>
                        </View>
                        <Text style={styles.categoryLabel}>{category.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.categoryDots} accessibilityRole="tablist">
              {CATEGORY_PAGES.map((page, index) => (
                <Pressable key={'category-dot-' + index} accessibilityRole="tab"
                  accessibilityState={{ selected: categoryPageIndex === index }}
                  accessibilityLabel={'Show category page ' + (index + 1)}
                  onPress={() => goToCategoryPage(index)}
                  style={[styles.categoryDot, categoryPageIndex === index && styles.categoryDotActive]} />
              ))}
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => {
            setSearch('');
            setRegionFilter('All');
            setDistrictFilter('');
            setScreen('providers');
            clearMessages();
          }} style={({ pressed }) => [styles.bookNowButton, pressed && styles.buttonPressed]}>
            <Text style={styles.bookNowText}>Book Now</Text>
            <Text style={styles.bookNowArrow}>→</Text>
          </Pressable>

          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Active Jobs</Text>
            <Pressable onPress={() => { setScreen('requests'); loadCustomerRequests(); clearMessages(); }}>
              <Text style={styles.seeAllText}>View all  ›</Text>
            </Pressable>
          </View>
          {jobs.filter(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)).length === 0 ? (
            <View style={styles.activeJobEmpty}>
              <View style={styles.emptyJobIcon}><Text style={styles.emptyJobIconText}>▤</Text></View>
              <Text style={styles.activeJobEmptyTitle}>No active jobs yet</Text>
              <Text style={styles.activeJobEmptyCopy}>Your service requests and provider updates will appear here.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeJobsRow}>
              {jobs.filter(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)).slice(0, 6).map((job, index) => (
                <ActiveWorkCard key={String(job.id || index)} job={job} role="customer"
                  onPress={() => { setScreen('requests'); loadCustomerRequests(); clearMessages(); }} />
              ))}
            </ScrollView>
          )}

          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Local Professionals</Text>
            <Pressable onPress={() => { setSearch(''); setScreen('providers'); clearMessages(); }}>
              <Text style={styles.seeAllText}>View all  ›</Text>
            </Pressable>
          </View>
          {filteredProviders.length === 0 ? (
            <View style={styles.activeJobEmpty}>
              <Text style={styles.activeJobEmptyCopy}>No live providers match your current search. Search another service or tap Book Now to browse.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerCarousel}>
              {filteredProviders.slice(0, 8).map((p, index) => (
                <View key={String(p.id) + '-' + String(p.service_id || index)} style={styles.homeProviderCard}>
                  {p.profile_photo_url
                    ? <RemoteImage uri={p.profile_photo_url} style={styles.homeProviderPhoto} fallbackText="No photo" />
                    : <View style={styles.homeProviderPhotoFallback}><Text style={styles.homeProviderInitial}>{String(p.business_name || p.full_name || 'FS').slice(0, 1).toUpperCase()}</Text></View>}
                  <Text numberOfLines={1} style={styles.homeProviderName}>{p.business_name || p.full_name || 'Service provider'}</Text>
                  <Text numberOfLines={1} style={styles.homeProviderService}>{p.service_name || 'Local services'}</Text>
                  <Text numberOfLines={1} style={styles.homeProviderLocation}>{p.area || p.district || 'Sierra Leone'}</Text>
                  <Text style={styles.homeProviderPrice}>{p.price_sle != null ? 'SLE ' + Number(p.price_sle).toLocaleString() : 'Quote needed'}</Text>
                  <Button title="View profile" secondary compact onPress={() => openProvider(p)} />
                  <Button title="Request service" compact onPress={() => startRequest(p, p)} />
                </View>
              ))}
            </ScrollView>
          )}
          <Button title="Refresh services and jobs" secondary onPress={refreshHomeData} disabled={busy} />
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
                    <Text style={styles.cardMeta}>{p.service_name || 'Local services'} · {p.region || 'Sierra Leone'}</Text>
                    <Text style={styles.cardMeta}>{p.area || ''}{p.district ? ', ' + p.district : ''}</Text>
                  </View>
                  <Text style={styles.verified}>{p.verification_status === 'verified' ? '✓ Verified' : ''}</Text>
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
          <Text style={styles.sectionLead}>Manage your business and customer work from here.</Text>

          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Active Work</Text>
            <Pressable onPress={() => { setScreen('requests'); loadProviderDashboard(); clearMessages(); }}>
              <Text style={styles.seeAllText}>View all  ›</Text>
            </Pressable>
          </View>
          {jobs.filter(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)).length === 0 ? (
            <View style={styles.activeJobEmpty}>
              <View style={styles.emptyJobIcon}><Text style={styles.emptyJobIconText}>▤</Text></View>
              <Text style={styles.activeJobEmptyTitle}>No active work yet</Text>
              <Text style={styles.activeJobEmptyCopy}>New requests and job progress will appear here as customers book your services.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeJobsRow}>
              {jobs.filter(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)).slice(0, 6).map((job, index) => (
                <ActiveWorkCard key={String(job.id || index)} job={job} role="provider"
                  onPress={() => { setScreen('requests'); loadProviderDashboard(); clearMessages(); }} />
              ))}
            </ScrollView>
          )}

          <Card>
            <Text style={styles.cardTitle}>{providerProfile?.business_name || 'Set up your provider profile'}</Text>
            <Text style={styles.cardDescription}>{providerProfile ? providerProfile.area + ', ' + providerProfile.district : 'Add your business location and main service before customers can find you.'}</Text>
            <Button title={providerProfile ? 'Edit business profile and services' : 'Set up provider profile'} onPress={openProviderSetup} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Referrals and subscription</Text>
            <Text style={styles.cardDescription}>Free providers receive 3 customer referrals. Paid plans unlock unlimited referrals and remove the 1% FixIt fee on job value.</Text>
            <Text style={styles.cardMeta}>Referrals used: {subscriptionInfo?.referral_count ?? jobMeta.referral_count ?? 0} / 3</Text>
            <Text style={styles.cardMeta}>Plan status: {subscriptionInfo?.subscription ? 'Active until ' + new Date(subscriptionInfo.subscription.expires_at).toLocaleDateString() : 'Free plan'}</Text>
            <Button title="View plans (SLE 20 / 40 / 60)" secondary onPress={openSubscription} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Incoming jobs</Text>
            <Text style={styles.cardDescription}>{jobs.length} request(s) currently visible.</Text>
            <Button title="Manage incoming jobs" onPress={() => { setScreen('requests'); loadProviderDashboard(); }} />
            <Button title={'Notifications (' + notifications.filter(n => !n.is_read).length + ')'} secondary onPress={loadNotifications} />
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
          <Button title="← Back" secondary onPress={() => setScreen('provider-detail')} />
          <Text style={styles.sectionLead}>Send a request to {selectedProvider?.business_name || selectedProvider?.full_name || 'this provider'}.</Text>
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
          <Text style={styles.sectionTitle}>Add job photos <Text style={styles.optionalText}>(optional)</Text></Text>
          <Text style={styles.helper}>Show the provider what needs to be fixed. Attach up to 5 JPG, PNG or WEBP photos (10 MB max each).</Text>
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
          <Button title={busy
              ? (pendingPhotoRequestId ? 'Uploading photos…' : 'Submitting…')
              : (pendingPhotoRequestId ? 'Retry photo upload' : 'Send service request')}
            onPress={createServiceRequest} disabled={busy} />
        </>}

        {screen === 'job-photos' && <>
          <Button title="← Back to jobs" secondary onPress={() => setScreen('requests')} />
          <Text style={styles.sectionLead}>Photos attached to service request {jobPhotosRequestId}.</Text>
          {busy && jobPhotos.length === 0 ? <ActivityIndicator size="large" color={COLORS.green} style={styles.spinner} /> :
            jobPhotos.length === 0 ? <Empty text="No photos are attached to this request yet." /> :
            jobPhotos.map((photo, index) => <Card key={String(photo.id || index)}>
              <AuthenticatedRequestImage uri={photo.file_url} token={token} style={styles.jobPhotoLarge} />
              <Text style={styles.cardTitle}>{photo.original_name || 'Job photo ' + (index + 1)}</Text>
              <Text style={styles.cardMeta}>Photo {index + 1} of {jobPhotos.length}</Text>
            </Card>)}
        </>}

        {screen === 'inbox' && user.role === 'customer' && <>
          <Text style={styles.sectionLead}>Updates about your service requests will appear in My Jobs. Direct customer-to-provider chat is not enabled in this mobile version yet.</Text>
          <Card>
            <View style={styles.inboxIllustration}><Text style={styles.inboxIllustrationText}>✉</Text></View>
            <Text style={styles.cardTitle}>Your message inbox</Text>
            <Text style={styles.cardDescription}>Once provider messaging is enabled, this is where you will chat with professionals about your jobs.</Text>
            <Button title="Check my jobs" onPress={() => { setScreen('requests'); loadCustomerRequests(); clearMessages(); }} />
            <Button title="Chat with FixIt Support" secondary onPress={() => { setScreen('support'); clearMessages(); }} />
          </Card>
        </>}

        {screen === 'requests' && user.role === 'customer' && <>

          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Your service activity</Text><Button title="Refresh" secondary compact onPress={loadCustomerRequests} disabled={busy} /></View>
          {jobs.length === 0 ? <Empty text="You have no service requests yet. Find a provider on Home and tap Request service." /> :
            jobs.map((j, i) => (
              <Card key={String(j.id || i)}>
                <View style={styles.cardTop}><Text style={styles.cardTitle}>{j.service_name || 'Service request'}</Text><Status value={j.status} /></View>
                <JobProgressDetails status={j.status} />
                <Text style={styles.cardMeta}>Provider: {j.business_name || j.provider_name || 'Provider'} · {j.created_at ? new Date(j.created_at).toLocaleDateString() : ''}</Text>
                <Text style={styles.cardDescription}>{j.job_details}</Text>
                <Text style={styles.cardMeta}>{j.area}, {j.district}, {j.region} · {j.service_address}</Text>
                <Button title="View attached job photos" secondary compact onPress={() => openJobPhotos(j.id)} />
                {j.quoted_amount != null && <Card>
                  <Text style={styles.cardTitle}>Quotation · SLE {Number(j.quoted_amount).toLocaleString()}</Text>
                  <Text style={styles.cardMeta}>Labour: SLE {Number(j.labour_amount || 0).toLocaleString()}</Text>
                  <Text style={styles.cardMeta}>Materials: SLE {Number(j.materials_amount || 0).toLocaleString()}</Text>
                  <Text style={styles.cardMeta}>Transport: SLE {Number(j.transport_amount || 0).toLocaleString()}</Text>
                  <Text style={styles.cardMeta}>FixIt fee: SLE {Number(j.platform_fee || 0).toLocaleString()}</Text>
                </Card>}
                {j.status === 'quoted' && <View style={styles.buttonRow}>
                  <View style={styles.buttonRowItem}><Button title="Approve quote" onPress={() => setJobStatus(j.id, 'approved')} /></View>
                  <View style={styles.buttonRowItem}><Button title="Decline" secondary onPress={() => setJobStatus(j.id, 'declined')} /></View>
                </View>}
                {j.status === 'approved' && <Button title="Prepare payment" onPress={() => preparePayment(j.id)} disabled={busy} />}
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
          {jobs.length === 0 ? <Empty text="No visible requests yet. Make sure your business profile and main service are saved." /> :
            jobs.map((j, i) => (
              <Card key={String(j.id || i)}>
                <View style={styles.cardTop}><Text style={styles.cardTitle}>{j.service_name || 'Service request'}</Text><Status value={j.status} /></View>
                <JobProgressDetails status={j.status} />
                <Text style={styles.cardMeta}>Customer: {j.customer_name || 'Customer'}{j.customer_phone ? ' · ' + j.customer_phone : ''}</Text>
                <Text style={styles.cardDescription}>{j.job_details}</Text>
                <Text style={styles.cardMeta}>{j.area}, {j.district}, {j.region} · {j.service_address}</Text>
                <Button title="View attached job photos" secondary compact onPress={() => openJobPhotos(j.id)} />
                {j.quoted_amount != null && <Text style={styles.priceText}>Quote: SLE {Number(j.quoted_amount).toLocaleString()}</Text>}
                {j.status === 'requested' && <>
                  <Button title="Send itemized quote" onPress={() => { setQuoteJobId(String(j.id)); setQuoteForm({ labour: '', materials: '', transport: '' }); }} />
                  {quoteJobId === String(j.id) && <View style={styles.reviewBox}>
                    <Field label="Labour (SLE)" value={quoteForm.labour} onChangeText={v => setQuoteValue('labour', v)} keyboardType="decimal-pad" placeholder="0" />
                    <Field label="Materials (SLE)" value={quoteForm.materials} onChangeText={v => setQuoteValue('materials', v)} keyboardType="decimal-pad" placeholder="0" />
                    <Field label="Transport (SLE)" value={quoteForm.transport} onChangeText={v => setQuoteValue('transport', v)} keyboardType="decimal-pad" placeholder="0" />
                    <Text style={styles.helper}>Free providers pay the 1% FixIt fee; active subscribers pay 0%. Total must be greater than zero.</Text>
                    <Button title="Send quote to customer" onPress={() => sendQuote(j.id)} disabled={busy} />
                    <Button title="Cancel quote" secondary onPress={() => setQuoteJobId('')} />
                  </View>}
                  <Button title="Decline request" secondary onPress={() => setJobStatus(j.id, 'declined')} />
                </>}
                {j.status === 'approved' && <Button title="Start job" onPress={() => setJobStatus(j.id, 'in_progress')} />}
                {j.status === 'in_progress' && <Button title="Mark job completed" onPress={() => setJobStatus(j.id, 'completed')} />}
                {['requested', 'quoted', 'approved', 'in_progress'].includes(j.status) && <Button title="Cancel job" secondary onPress={() => setJobStatus(j.id, 'cancelled')} />}
              </Card>
            ))}
          <Text style={styles.helper}>Referral access: {jobMeta.referral_count ?? 0} used · {jobMeta.subscription ? 'Subscription active' : 'Free plan'}.</Text>
          <Button title="Manage subscription" secondary onPress={openSubscription} />
        </>}

        {screen === 'account' && <>
          <Card style={styles.accountSummaryCard}>
            <View style={styles.accountSummaryRow}>
              {user.role === 'customer' ? (
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
            {user.role === 'customer' && (
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
            <View style={styles.wrapChips}>{services.map(s => <Chip key={String(s.id)} title={s.name} active={providerForm.serviceId === String(s.id)} onPress={() => setProviderFormValue('serviceId', String(s.id))} />)}</View>}
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
          <Text style={styles.sectionLead}>Choose the plan that matches your business.</Text>
          <Card><Text style={styles.cardTitle}>Free · SLE 0/month</Text><Text style={styles.cardDescription}>3 customer referrals. New request details become locked after the free allowance.</Text><Text style={styles.cardMeta}>1% FixIt transaction fee</Text></Card>
          {[
            { name: 'Pro', price: 20, description: 'Unlimited referrals and 0% FixIt transaction fee.' },
            { name: 'Business', price: 40, description: 'Pro benefits plus enhanced business visibility and provider tools as they become available.' },
            { name: 'Premium', price: 60, description: 'Business benefits plus top-tier visibility and priority benefits as they become available.' }
          ].map(p => <Card key={p.name}>
            <Text style={styles.cardTitle}>{p.name} · SLE {p.price}/month</Text>
            <Text style={styles.cardDescription}>{p.description}</Text>
            <Button title={'Request ' + p.name + ' plan'} onPress={() => requestSubscription(p.name)} disabled={busy || !!(subscriptionInfo?.payments || []).some(x => ['pending', 'processing'].includes(x.status))} />
          </Card>)}
          <Text style={styles.helper}>Important: online payment is not connected yet. The backend can record a subscription request, but selecting a plan does not charge you or activate the subscription.</Text>
          {subscriptionInfo && <>
            <Text style={styles.sectionTitle}>Current status</Text>
            <Card><Text style={styles.cardTitle}>{subscriptionInfo.subscription ? 'Subscription active' : 'No active paid subscription'}</Text><Text style={styles.cardMeta}>Referrals used: {subscriptionInfo.referral_count || 0} · Free referrals: {subscriptionInfo.free_referrals || 3}</Text></Card>
            <Text style={styles.sectionTitle}>Recent subscription requests</Text>
            {(subscriptionInfo.payments || []).length ? subscriptionInfo.payments.map(p => <Card key={String(p.id)}><Text style={styles.cardTitle}>{p.plan_name} · SLE {Number(p.amount_sle).toLocaleString()}</Text><Text style={styles.cardMeta}>Status: {p.status} · {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</Text></Card>) : <Empty text="No subscription payment requests recorded yet." />}
          </>}
        </>}

        {screen === 'notifications' && <>
          <Button title="← Back to dashboard" secondary onPress={() => setScreen('home')} />
          <Button title="Refresh notifications" secondary onPress={loadNotifications} />
          {notifications.length === 0 ? <Empty text="No provider notifications found." /> : notifications.map(n =>
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
          <Text style={styles.helper}>Real SMS verification works only after the SMS provider is configured on the backend. Identity document uploads are still available on the website, not in this mobile build yet.</Text>
        </>}

        {screen === 'safety' && <>
          <Button title="← Back to account" secondary onPress={() => setScreen('account')} />
          <Text style={styles.sectionLead}>Report fraud, threats, harassment, damage, or another safety concern. Your report is sent to FixIt Trust & Safety.</Text>
          {!!selectedProvider && <Text style={styles.helper}>This report will be linked to: {selectedProvider.business_name || selectedProvider.full_name || 'selected provider'}.</Text>}
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
        <Pressable style={styles.tabItem} onPress={() => { setScreen('home'); clearMessages(); }}>
          <Text style={[styles.tabIcon, screen === 'home' && styles.tabIconActive]}>⌂</Text>
          <Text style={[styles.tabText, screen === 'home' && styles.tabTextActive]}>Home</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => { setScreen('requests'); clearMessages(); user.role === 'provider' ? loadProviderDashboard() : loadCustomerRequests(); }}>
          <Text style={[styles.tabIcon, screen === 'requests' && styles.tabIconActive]}>▤</Text>
          <Text style={[styles.tabText, screen === 'requests' && styles.tabTextActive]}>{user.role === 'provider' ? 'My Jobs' : 'My Jobs'}</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => {
          clearMessages();
          if (user.role === 'provider') loadNotifications();
          else setScreen('inbox');
        }}>
          <View style={styles.tabIconWrap}>
            <Text style={[styles.tabIcon, (screen === 'inbox' || screen === 'notifications') && styles.tabIconActive]}>✉</Text>
            {user.role === 'provider' && notifications.some(n => !n.is_read) ? <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{notifications.filter(n => !n.is_read).length > 9 ? '9+' : notifications.filter(n => !n.is_read).length}</Text></View> : null}
          </View>
          <Text style={[styles.tabText, (screen === 'inbox' || screen === 'notifications') && styles.tabTextActive]}>Inbox</Text>
        </Pressable>
        <Pressable style={styles.tabItem} onPress={() => { setScreen('account'); clearMessages(); }}>
          <View style={[styles.profileTabAvatar, screen === 'account' && styles.profileTabAvatarActive]}>
            {user.role === 'customer' && profilePhotoUrl
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
  authSafe: { flex: 1, backgroundColor: COLORS.pale, paddingTop: Platform.OS === 'android' ? 3 : 32, paddingBottom: Platform.OS === 'android' ? 12 : 0 },
  authScreen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 25, backgroundColor: COLORS.pale },
  authBrandHeader: { paddingHorizontal: 5, paddingTop: 4, paddingBottom: 18 },
  authBrandTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  authBrandCopy: { flex: 1, alignItems: 'center' },
  authBrandTitle: { fontSize: 31, fontWeight: '900', letterSpacing: -0.8, textShadowColor: '#00000055', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },
  authBrandGold: { color: COLORS.orange },
  authBrandWhite: { color: COLORS.navy },
  authTagline: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: 'center' },
  authShield: { width: 54, height: 61, marginRight: 2, borderWidth: 2, borderColor: COLORS.orange, borderRadius: 16, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 3 },
  authShieldText: { color: COLORS.white, fontSize: 30, fontWeight: '900', lineHeight: 35 },
  authShieldCheck: { color: COLORS.orange, fontSize: 13, fontWeight: '900', marginTop: -7 },
  authWelcomePanel: { backgroundColor: COLORS.navy, borderRadius: 25, paddingHorizontal: 20, paddingTop: 21, paddingBottom: 19, borderWidth: 1, borderColor: '#334155', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  authWelcomeTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.55 },
  authWelcomeCopy: { color: '#E2E8F0', fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 17 },
  authRoleRow: { flexDirection: 'row', gap: 9 },
  authRoleChoice: { flex: 1, minHeight: 66, paddingHorizontal: 8, paddingVertical: 10, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#475569', backgroundColor: '#1E293B' },
  authRoleChoiceActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orangeDark, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  authRolePressed: { opacity: 0.82 },
  authRoleTitle: { color: '#E8ECF2', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  authRoleTitleActive: { color: '#FFFFFF' },
  authRoleSubtitle: { color: '#CBD5E1', fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 3 },
  authRoleSubtitleActive: { color: '#FFFFFF' },
  authDetailsPanel: { backgroundColor: COLORS.white, marginTop: 14, borderRadius: 24, paddingHorizontal: 19, paddingTop: 16, paddingBottom: 16, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  authSecurityNote: { color: COLORS.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 5 },
  authDetailsTitle: { color: COLORS.navy, fontSize: 26, fontWeight: '900', letterSpacing: -0.6, marginBottom: 17 },
  authFieldLabel: { color: COLORS.navy, fontSize: 13, fontWeight: '800', marginBottom: 6, marginTop: 1 },
  authInputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 54, borderRadius: 14, backgroundColor: COLORS.pale, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 12 },
  authCountryFlag: { fontSize: 22, marginRight: 8 },
  authCountryCode: { color: COLORS.ink, fontSize: 15, fontWeight: '700', marginRight: 8 },
  authInput: { flex: 1, minWidth: 0, color: COLORS.ink, fontSize: 15, paddingVertical: 11 },
  authPhoneIcon: { color: COLORS.muted, fontSize: 20, marginLeft: 7 },
  authPasswordLabel: { marginTop: 13 },
  authEyeButton: { paddingHorizontal: 5, paddingVertical: 7, marginLeft: 4 },
  authEyeText: { color: COLORS.muted, fontSize: 16, fontWeight: '800' },
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

  homeHeader: { backgroundColor: COLORS.white, paddingTop: Platform.OS === 'android' ? 9 : 12, paddingBottom: 15, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  homeBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeLogoMark: { width: 43, height: 43, borderRadius: 13, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.line },
  homeLogoSymbol: { fontSize: 24 },
  homeBrandText: { flex: 1 },
  homeBrand: { fontSize: 21, fontWeight: '900', letterSpacing: -0.55 },
  homeBrandFix: { color: COLORS.navy },
  homeBrandSalone: { color: COLORS.orange },
  homeGreeting: { color: COLORS.ink, fontSize: 15, fontWeight: '700', marginTop: 2 },
  homeSectionHeading: { marginTop: 3, marginBottom: 10 },
  homeSectionTitle: { color: COLORS.navy, fontSize: 17, fontWeight: '900', letterSpacing: -0.25 },
  homepageSlidesWrap: { width: '100%', marginBottom: 15, borderRadius: 18, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  homepageSlideImage: { width: '100%', height: 165, backgroundColor: COLORS.card },
  homepageSlideDots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.35)' },
  homepageSlideDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)' },
  homepageSlideDotActive: { width: 19, backgroundColor: COLORS.orange },
  categoryCarouselWrap: { width: '100%', marginBottom: 7 },
  categoryCarouselPage: { paddingHorizontal: 1 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 1 },
  categoryTile: { width: '31.6%', alignItems: 'center', marginBottom: 10, borderRadius: 13, paddingBottom: 2 },
  categoryTilePressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  categoryArt: { width: '100%', aspectRatio: 1.06, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(15,23,42,0.04)' },
  categorySymbol: { fontSize: 38 },
  categoryLabel: { color: COLORS.navy, textAlign: 'center', fontWeight: '800', fontSize: 12, lineHeight: 15, marginTop: 5, minHeight: 30 },
  categoryDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 2, paddingBottom: 2 },
  categoryDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CBD5E1' },
  categoryDotActive: { width: 13, backgroundColor: COLORS.orange },
  bookNowButton: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orange, borderRadius: 12, marginTop: 1, marginBottom: 15, shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  bookNowText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
  bookNowArrow: { color: COLORS.white, fontSize: 19, marginLeft: 9, marginTop: -1 },
  homeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  seeAllText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  activeJobEmpty: { backgroundColor: COLORS.white, borderRadius: 15, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.line, marginBottom: 10 },
  emptyJobIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyJobIconText: { fontSize: 20, color: COLORS.orange },
  activeJobEmptyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  activeJobEmptyCopy: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  activeJobsRow: { paddingRight: 4, paddingBottom: 4 },
  activeJobCard: { width: 330, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, marginRight: 11, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 7, elevation: 1 },
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
  homeProviderCard: { width: 178, backgroundColor: COLORS.white, borderRadius: 15, padding: 11, marginRight: 10, borderWidth: 1, borderColor: COLORS.line, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 7, elevation: 1 },
  homeProviderPhoto: { width: '100%', height: 96, borderRadius: 11, backgroundColor: COLORS.card, marginBottom: 9 },
  homeProviderPhotoFallback: { width: '100%', height: 96, borderRadius: 11, backgroundColor: COLORS.softBlue, marginBottom: 9, alignItems: 'center', justifyContent: 'center' },
  homeProviderInitial: { color: COLORS.navy, fontSize: 27, fontWeight: '900' },
  homeProviderName: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  homeProviderService: { color: COLORS.orange, fontSize: 11, fontWeight: '800', marginTop: 3 },
  homeProviderLocation: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  homeProviderPrice: { color: COLORS.orangeDark, fontSize: 11, fontWeight: '900', marginTop: 6, marginBottom: 2 },
  tabIconWrap: { position: 'relative', minWidth: 26, alignItems: 'center' },
  tabBadge: { position: 'absolute', top: -4, right: -9, backgroundColor: COLORS.orange, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  profileTabAvatar: { width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: '#F6CDAE', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  profileTabAvatarActive: { borderColor: COLORS.orange, borderWidth: 2 },
  profileTabAvatarText: { color: COLORS.orangeDark, fontSize: 10, fontWeight: '900' },
  inboxIllustration: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orangeLight, marginBottom: 11 },
  inboxIllustrationText: { fontSize: 25, color: COLORS.orange },
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
  avatarImage: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: COLORS.line, backgroundColor: COLORS.card },
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
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#E7E8EA', paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 18 : 8, paddingHorizontal: 5, minHeight: Platform.OS === 'android' ? 66 : 70, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 14 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRadius: 13 },
  tabIcon: { color: '#94A3B8', fontSize: 21, lineHeight: 24, fontWeight: '800', marginBottom: 1 },
  tabIconActive: { color: COLORS.orange },
  tabText: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  tabTextActive: { color: COLORS.orange },
  chatLog: { backgroundColor: COLORS.card, borderRadius: 17, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  chatBubble: { borderRadius: 13, padding: 12, marginVertical: 4, maxWidth: '92%' },
  chatUser: { alignSelf: 'flex-end', backgroundColor: COLORS.orangeLight },
  chatAssistant: { alignSelf: 'flex-start', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  chatLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '900', marginBottom: 4 },
  chatText: { color: COLORS.ink, fontSize: 14, lineHeight: 20 }
});
