import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View
} from 'react-native';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl || 'https://fixit-salone-api.onrender.com').replace(/\/$/, '');
const COLORS = {
  navy: '#0C2340', green: '#16834A', pale: '#F6F7F8', ink: '#1D2939',
  muted: '#667085', line: '#E4E7EC', white: '#FFFFFF', red: '#B42318',
  lightGreen: '#E7F5EC', amber: '#9A6700', orange: '#E5791B', orangeLight: '#FFF0E3'
};
const HOME_CATEGORIES = [
  { label: 'Plumbing', symbol: '🔧', query: 'plumbing', tint: '#DCECFB' },
  { label: 'Electrical', symbol: '💡', query: 'electrical', tint: '#FBE9D8' },
  { label: 'General Home', symbol: '🏠', query: 'home', tint: '#DFF2E8' },
  { label: 'Roofing', symbol: '🪜', query: 'roofing', tint: '#FBE7D4' },
  { label: 'Appliance Repair', symbol: '🧊', query: 'appliance repair', tint: '#E6E8F6' },
  { label: 'Emergency Services', symbol: '🚨', query: 'emergency', tint: '#F9E2E6' }
];
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
  const needsAuthHeader = raw.startsWith('/api/service-requests/');
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

export default function App() {
  const [screen, setScreen] = useState('auth');
  const [authMode, setAuthMode] = useState('login');
  const [role, setRole] = useState('customer');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
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

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body && !(typeof FormData !== 'undefined' && options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(API_BASE + path, { ...options, headers });
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
      const data = await api(registering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(registering
          ? { full_name: fullName.trim(), phone: phone.trim(), password, role }
          : { phone: phone.trim(), password })
      });
      setToken(data.token);
      setUser(data.user);
      setRole(data.user.role);
      setScreen('home');
      setPassword('');
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
  async function loadProviderDashboard() {
    try {
      const profileData = await api('/api/providers/me/profile');
      setProviderProfile(profileData.profile || null);
      setProviderServices(Array.isArray(profileData.services) ? profileData.services : []);
      if (profileData.profile) {
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
    if (token && user?.id) {
      loadServices();
      if (user.role === 'provider') loadProviderDashboard();
      else { loadProviders(); loadCustomerRequests(); }
    }
  }, [token, user?.id, user?.role]);

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
      const type = photo.mimeType || 'image/jpeg';
      const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      form.append('photos', {
        uri: photo.uri,
        name: photo.fileName || 'fixit-request-' + String(requestId) + '-' + String(index + 1) + '.' + ext,
        type
      });
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
      setNotice('Your provider profile and main service have been saved.');
      await loadProviderDashboard();
      setScreen('home');
    } catch (e) { reportError(e); }
    finally { setBusy(false); }
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
      await api('/api/phone-verification/verify', {
        method: 'POST', body: JSON.stringify({ verification_id: verificationId, otp: otp.trim() })
      });
      setNotice('Phone number verified successfully.');
      setVerificationId(''); setOtp('');
      await loadVerification();
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
    setToken(''); setUser(null); setScreen('auth'); setAuthMode('login'); setPassword('');
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

  if (!token || !user) {
    return (
      <View style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.pale} />
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authScreen}>
            <View style={styles.brandMark}><Text style={styles.brandIcon}>⌂</Text></View>
            <Text style={styles.brand}><Text style={{ color: COLORS.navy }}>FixIt</Text><Text style={{ color: COLORS.green }}> Salone</Text></Text>
            <Text style={styles.tagline}>Trusted local services, made simpler.</Text>
            <View style={styles.authCard}>
              <Text style={styles.heading}>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
              <Text style={styles.subheading}>Choose how you want to use FixIt Salone.</Text>
              <View style={styles.roleRow}>
                <Chip title="Customer" active={role === 'customer'} onPress={() => setRole('customer')} />
                <Chip title="Service provider" active={role === 'provider'} onPress={() => setRole('provider')} />
              </View>
              {authMode === 'register' && <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Full name" />}
              <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="e.g. +232XXXXXXXX" keyboardType="phone-pad" autoCapitalize="none" />
              <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoCapitalize="none" />
              {noticePanel}
              <Button title={busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'} onPress={signInOrRegister} disabled={busy} />
              <Button title={authMode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'} secondary onPress={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); clearMessages(); }} />
              <Text style={styles.footnote}>Never share your password or verification codes with anyone.</Text>
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
            <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => { setScreen('account'); clearMessages(); }} style={({ pressed }) => [styles.homeProfileButton, pressed && styles.buttonPressed]}>
              <Text style={styles.homeProfileIcon}>{(user.full_name || 'U').trim().slice(0, 1).toUpperCase()}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderTitle}>{pageTitle}</Text>
          {user.role === 'provider' && (
            <Pressable accessibilityRole="button" onPress={() => { setScreen('account'); clearMessages(); }}
              style={({ pressed }) => [styles.pageHeaderAction, pressed && styles.buttonPressed]}>
              <Text style={styles.pageHeaderActionText}>Account</Text>
            </Pressable>
          )}
        </View>
      )}

      {noticePanel}
      <ScrollView style={styles.mainScroll} contentContainerStyle={styles.mainContent} keyboardShouldPersistTaps="handled">
        {screen === 'home' && user.role === 'customer' && <>
          <Field value={search} onChangeText={setSearch} placeholder="⌕  Search repairs or technicians..." autoCapitalize="none" />

          <View style={styles.homeSectionHeading}>
            <Text style={styles.homeSectionTitle}>Quick Categories</Text>
          </View>
          <View style={styles.categoryGrid}>
            {HOME_CATEGORIES.map(category => (
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
              {jobs.filter(j => ['requested', 'quoted', 'approved', 'in_progress'].includes(j.status)).slice(0, 6).map((job, index) => {
                const progress = ({ requested: 22, quoted: 42, approved: 58, in_progress: 78 })[job.status] || 18;
                return (
                  <View key={String(job.id || index)} style={styles.activeJobCard}>
                    <View style={styles.activeJobTop}>
                      <View style={styles.jobIllustration}><Text style={styles.jobIllustrationText}>🛠️</Text></View>
                      <View style={styles.activeJobSummary}>
                        <Text numberOfLines={2} style={styles.activeJobTitle}>{job.service_name || 'Service request'}</Text>
                        <Text style={styles.activeJobStatus}>Status: <Text style={styles.activeJobStatusValue}>{String(job.status || 'requested').replaceAll('_', ' ')}</Text></Text>
                        <Text numberOfLines={1} style={styles.activeJobProvider}>{job.business_name || job.provider_name || 'Waiting for provider'}</Text>
                      </View>
                    </View>
                    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: progress + '%' }]} /></View>
                    <Pressable onPress={() => { setScreen('requests'); loadCustomerRequests(); clearMessages(); }} style={styles.jobDetailButton}>
                      <Text style={styles.jobDetailButtonText}>View details</Text>
                    </Pressable>
                  </View>
                );
              })}
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
          <Text style={styles.fieldLabel}>Filter by region</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
            <Chip title="All regions" active={regionFilter === 'All'} onPress={() => setRegionFilter('All')} />
            {REGIONS.map(r => <Chip key={r} title={r} active={regionFilter === r} onPress={() => setRegionFilter(r)} />)}
          </ScrollView>
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
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>{(user.full_name || 'F').trim().slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.accountIdentity}>
                <Text style={styles.bigTitle}>{user.full_name || 'FixIt account'}</Text>
                <Text style={styles.cardMeta}>{user.phone}</Text>
                <View style={styles.accountTypeBadge}>
                  <Text style={styles.accountTypeText}>{user.role === 'provider' ? 'SERVICE PROVIDER' : 'CUSTOMER ACCOUNT'}</Text>
                </View>
              </View>
            </View>
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
          <Text style={styles.helper}>Photo uploads and multiple service entries are not included in this mobile update yet. Your existing website still has those tools.</Text>
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
            <Text style={styles.profileTabAvatarText}>{(user.full_name || 'U').trim().slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={[styles.tabText, screen === 'account' && styles.tabTextActive]}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.pale, paddingTop: Platform.OS === 'android' ? 3 : 32, paddingBottom: Platform.OS === 'android' ? 44 : 0 },
  authScreen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 24, backgroundColor: COLORS.pale },
  brandMark: { alignSelf: 'center', width: 68, height: 68, borderRadius: 23, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.16, shadowRadius: 13, elevation: 5 },
  brandIcon: { color: COLORS.white, fontSize: 42, fontWeight: '700', marginTop: -5 },
  brand: { fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1.1 },
  tagline: { textAlign: 'center', color: COLORS.muted, marginTop: 8, marginBottom: 25, fontSize: 15, lineHeight: 21 },
  authCard: { backgroundColor: COLORS.white, borderRadius: 26, padding: 21, borderWidth: 1, borderColor: '#E5ECE8', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 18, elevation: 3 },
  heading: { fontSize: 26, fontWeight: '900', color: COLORS.ink, letterSpacing: -0.7 },
  subheading: { color: COLORS.muted, lineHeight: 22, marginTop: 6, marginBottom: 18, fontSize: 14 },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 19, borderBottomLeftRadius: 23, borderBottomRightRadius: 23, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  pageHeader: { minHeight: 68, backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 9 : 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E9ECEF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageHeaderTitle: { color: COLORS.navy, fontSize: 23, fontWeight: '900', letterSpacing: -0.55, flex: 1 },
  pageHeaderAction: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11, backgroundColor: '#E8F5EC', borderWidth: 1, borderColor: '#C8E7D2' },
  pageHeaderActionText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },

  homeHeader: { backgroundColor: COLORS.white, paddingTop: Platform.OS === 'android' ? 9 : 12, paddingBottom: 15, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: '#F0F1F2' },
  homeBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeLogoMark: { width: 43, height: 43, borderRadius: 13, backgroundColor: '#EFF4FA', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DDE6F0' },
  homeLogoSymbol: { fontSize: 24 },
  homeBrandText: { flex: 1 },
  homeBrand: { fontSize: 21, fontWeight: '900', letterSpacing: -0.55 },
  homeBrandFix: { color: COLORS.navy },
  homeBrandSalone: { color: COLORS.orange },
  homeGreeting: { color: '#343C46', fontSize: 15, fontWeight: '700', marginTop: 2 },
  homeProfileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FCE7D7', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F2CEB1' },
  homeProfileIcon: { color: '#8D4A12', fontSize: 16, fontWeight: '900' },
  homeSectionHeading: { marginTop: 3, marginBottom: 10 },
  homeSectionTitle: { color: '#1B2026', fontSize: 17, fontWeight: '900', letterSpacing: -0.25 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 5 },
  categoryTile: { width: '31.6%', alignItems: 'center', marginBottom: 12, borderRadius: 13, paddingBottom: 3 },
  categoryTilePressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  categoryArt: { width: '100%', aspectRatio: 1.06, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(12,35,64,0.04)' },
  categorySymbol: { fontSize: 38 },
  categoryLabel: { color: '#171C22', textAlign: 'center', fontWeight: '800', fontSize: 12, lineHeight: 15, marginTop: 5, minHeight: 30 },
  bookNowButton: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.orange, borderRadius: 12, marginTop: 1, marginBottom: 15, shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 5, elevation: 3 },
  bookNowText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
  bookNowArrow: { color: COLORS.white, fontSize: 19, marginLeft: 9, marginTop: -1 },
  homeSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  seeAllText: { color: '#5C6570', fontSize: 12, fontWeight: '800' },
  activeJobEmpty: { backgroundColor: COLORS.white, borderRadius: 15, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E8EAED', marginBottom: 10 },
  emptyJobIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFF0E3', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyJobIconText: { fontSize: 20, color: COLORS.orange },
  activeJobEmptyTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  activeJobEmptyCopy: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  activeJobsRow: { paddingRight: 4, paddingBottom: 4 },
  activeJobCard: { width: 282, backgroundColor: COLORS.white, borderRadius: 16, padding: 12, marginRight: 11, borderWidth: 1, borderColor: '#E5E8EB', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 7, elevation: 2 },
  activeJobTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  jobIllustration: { width: 72, height: 72, borderRadius: 11, backgroundColor: '#F1EDE5', alignItems: 'center', justifyContent: 'center' },
  jobIllustrationText: { fontSize: 29 },
  activeJobSummary: { flex: 1 },
  activeJobTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  activeJobStatus: { color: COLORS.muted, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  activeJobStatusValue: { color: COLORS.green, fontWeight: '900', textTransform: 'capitalize' },
  activeJobProvider: { color: '#333B44', fontSize: 10, fontWeight: '700', marginTop: 5 },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: '#E9ECEF', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#2575AF' },
  jobDetailButton: { borderWidth: 1, borderColor: '#EDCEAB', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, marginTop: 10, backgroundColor: '#FFF8EF' },
  jobDetailButtonText: { color: '#94551A', fontSize: 12, fontWeight: '800' },
  providerCarousel: { paddingBottom: 4, paddingRight: 4 },
  homeProviderCard: { width: 178, backgroundColor: COLORS.white, borderRadius: 15, padding: 11, marginRight: 10, borderWidth: 1, borderColor: '#E5E8EB', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 7, elevation: 2 },
  homeProviderPhoto: { width: '100%', height: 96, borderRadius: 11, backgroundColor: '#F0F2F3', marginBottom: 9 },
  homeProviderPhotoFallback: { width: '100%', height: 96, borderRadius: 11, backgroundColor: '#E4EDF5', marginBottom: 9, alignItems: 'center', justifyContent: 'center' },
  homeProviderInitial: { color: COLORS.navy, fontSize: 27, fontWeight: '900' },
  homeProviderName: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  homeProviderService: { color: COLORS.orange, fontSize: 11, fontWeight: '800', marginTop: 3 },
  homeProviderLocation: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  homeProviderPrice: { color: COLORS.green, fontSize: 11, fontWeight: '900', marginTop: 6, marginBottom: 2 },
  tabIconWrap: { position: 'relative', minWidth: 26, alignItems: 'center' },
  tabBadge: { position: 'absolute', top: -4, right: -9, backgroundColor: COLORS.orange, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  profileTabAvatar: { width: 25, height: 25, borderRadius: 13, backgroundColor: '#FCE7D7', borderWidth: 1, borderColor: '#F2CEB1', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  profileTabAvatarActive: { borderColor: COLORS.orange, borderWidth: 2 },
  profileTabAvatarText: { color: '#8D4A12', fontSize: 10, fontWeight: '900' },
  inboxIllustration: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCE7D7', marginBottom: 11 },
  inboxIllustrationText: { fontSize: 25, color: COLORS.orange },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#193956', borderWidth: 1, borderColor: '#35526D', alignItems: 'center', justifyContent: 'center' },
  headerLogoIcon: { fontSize: 29, color: COLORS.white, marginTop: -2, fontWeight: '800' },
  headerBrand: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  headerSmall: { color: '#D0D9E2', marginTop: 3, fontSize: 12 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, backgroundColor: '#23435E', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#3C5870' },
  roleBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.65 },
  roleBadgeArrow: { color: '#B8E3C7', fontSize: 13, fontWeight: '900' },
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
  pickerTrigger: { minHeight: 49, borderWidth: 1, borderColor: '#DDE5E1', backgroundColor: COLORS.white, borderRadius: 14, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerValue: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  pickerPlaceholder: { color: '#98A2B3', fontWeight: '400' },
  pickerChevron: { color: COLORS.green, fontSize: 23, fontWeight: '800', marginLeft: 12, marginTop: -4 },
  pickerPressed: { opacity: 0.78, backgroundColor: '#F3F8F5' },
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 22, backgroundColor: 'rgba(12,35,64,0.45)' },
  pickerBackdrop: { ...StyleSheet.absoluteFillObject },
  pickerSheet: { width: '100%', maxWidth: 420, maxHeight: '78%', backgroundColor: COLORS.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#DFE7E2', elevation: 14, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '900', color: COLORS.ink, paddingHorizontal: 4, paddingTop: 3, paddingBottom: 12 },
  pickerOptions: { flexGrow: 0 },
  pickerOption: { minHeight: 48, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F0F3F1' },
  pickerOptionSelected: { backgroundColor: '#E7F5EC', borderBottomColor: '#D4ECDD' },
  pickerOptionText: { color: COLORS.ink, fontSize: 15, fontWeight: '600' },
  pickerOptionTextSelected: { color: COLORS.green, fontWeight: '900' },
  pickerCheck: { color: COLORS.green, fontSize: 18, fontWeight: '900', marginLeft: 12 },
  pickerCancel: { marginTop: 10, minHeight: 44, borderRadius: 12, backgroundColor: '#F2F5F3', alignItems: 'center', justifyContent: 'center' },
  pickerCancelText: { color: COLORS.ink, fontSize: 14, fontWeight: '800' },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#DDE5E1', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15, color: COLORS.ink, minHeight: 49 },
  textArea: { minHeight: 108, paddingTop: 12 },
  optionalText: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  photoActions: { flexDirection: 'row', gap: 8, alignItems: 'stretch', marginBottom: 8 },
  photoActionItem: { flex: 1 },
  selectedPhotosWrap: { backgroundColor: '#F7FAF8', borderRadius: 15, borderWidth: 1, borderColor: '#DFEAE3', padding: 10, marginTop: 2, marginBottom: 8 },
  photoCount: { color: COLORS.ink, fontSize: 12, fontWeight: '800', marginBottom: 9 },
  selectedPhotosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  selectedPhotoItem: { width: 88, marginBottom: 2 },
  selectedPhotoThumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#EAF2ED', borderWidth: 1, borderColor: '#D8E7DE' },
  selectedPhotoLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  removePhotoButton: { position: 'absolute', right: -5, top: -5, width: 25, height: 25, borderRadius: 13, backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  removePhotoText: { color: COLORS.white, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  button: { backgroundColor: COLORS.green, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 7, marginBottom: 3, minHeight: 46, shadowColor: COLORS.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 2 },
  buttonSecondary: { backgroundColor: '#ECF7F0', borderWidth: 1, borderColor: '#C8E7D2', shadowOpacity: 0, elevation: 0 },
  buttonCompact: { paddingVertical: 8, paddingHorizontal: 12, marginTop: 0, marginBottom: 0, minHeight: 34 },
  buttonText: { color: COLORS.white, fontWeight: '900', fontSize: 13, textAlign: 'center', letterSpacing: 0.1 },
  buttonSecondaryText: { color: COLORS.green },
  buttonPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  buttonRowItem: { flex: 1 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  chip: { borderWidth: 1, borderColor: '#DFE7E2', borderRadius: 13, paddingVertical: 9, paddingHorizontal: 12, backgroundColor: COLORS.white, marginRight: 7, marginBottom: 7 },
  chipActive: { backgroundColor: '#E4F4E9', borderColor: COLORS.green },
  chipPressed: { opacity: 0.78 },
  chipText: { color: COLORS.muted, fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: COLORS.green },
  horizontalChips: { marginVertical: 7, flexGrow: 0 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  card: { backgroundColor: COLORS.white, borderRadius: 19, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: '#E3EAE6', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.045, shadowRadius: 10, elevation: 2 },
  accountSummaryCard: { paddingVertical: 17, marginBottom: 14 },
  accountSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  accountAvatar: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCE7D7', borderWidth: 1, borderColor: '#F2CEB1' },
  accountAvatarText: { color: '#8D4A12', fontSize: 25, fontWeight: '900' },
  accountIdentity: { flex: 1, minWidth: 0 },
  accountTypeBadge: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: '#E8F5EC' },
  accountTypeText: { color: COLORS.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.45 },
  accountSectionHeading: { marginTop: 2, marginBottom: 11 },
  accountSectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  accountSectionSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  accountGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 8 },
  accountTile: { width: '48.5%', minHeight: 104, backgroundColor: COLORS.white, borderRadius: 16, borderWidth: 1, borderColor: '#E2E9E5', padding: 12, justifyContent: 'space-between', shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.035, shadowRadius: 7, elevation: 1 },
  accountTilePressed: { borderColor: '#9BD2AE', backgroundColor: '#F7FCF8' },
  accountTileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  accountTileIconWrap: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5EC' },
  accountTileIcon: { color: COLORS.green, fontSize: 18, fontWeight: '900' },
  accountTileArrow: { color: '#9BA6B0', fontSize: 15, fontWeight: '800' },
  accountTileTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  accountTileSubtitle: { color: COLORS.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  signOutAction: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#F0CECE', backgroundColor: '#FFF8F8', flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 2, marginBottom: 8 },
  signOutIcon: { color: COLORS.red, fontSize: 18, fontWeight: '900' },
  signOutText: { color: COLORS.red, fontSize: 13, fontWeight: '900' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 },
  providerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatarImage: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: '#CDE8D5', backgroundColor: '#E4F4E9' },
  providerProfileHero: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 14 },
  profilePhoto: { width: 94, height: 94, borderRadius: 25, backgroundColor: '#E4F4E9', borderWidth: 1, borderColor: '#CDE8D5' },
  profileIdentity: { flex: 1, minWidth: 0 },
  profileRating: { color: '#A66A00', fontSize: 14, fontWeight: '900', marginTop: 8 },
  imagePlaceholder: { backgroundColor: '#EAF2ED', borderWidth: 1, borderColor: '#D8E7DE', alignItems: 'center', justifyContent: 'center', padding: 5, overflow: 'hidden' },
  imagePlaceholderText: { color: '#597363', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  portfolioCard: { overflow: 'hidden' },
  portfolioImage: { width: '100%', height: 220, borderRadius: 14, marginBottom: 13, backgroundColor: '#EAF2ED' },
  jobPhotoLarge: { width: '100%', height: 245, borderRadius: 14, backgroundColor: '#EAF2ED', marginBottom: 10 },
  videoPreview: { height: 160, borderRadius: 14, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  videoPreviewIcon: { color: COLORS.white, fontSize: 30, fontWeight: '900' },
  videoPreviewText: { color: '#C9D8E4', fontSize: 12, fontWeight: '800', marginTop: 6 },
  grow: { flex: 1 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#E4F4E9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CDE8D5' },
  avatarText: { color: COLORS.green, fontSize: 19, fontWeight: '900' },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '900', letterSpacing: -0.2 },
  bigTitle: { color: COLORS.ink, fontSize: 23, fontWeight: '900', marginBottom: 5, letterSpacing: -0.5 },
  cardMeta: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  cardDescription: { color: '#344054', fontSize: 14, lineHeight: 21, marginTop: 9 },
  priceText: { color: COLORS.green, fontSize: 15, fontWeight: '900', marginTop: 9 },
  verified: { color: COLORS.green, fontSize: 10, fontWeight: '900' },
  status: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EEF2F6', borderRadius: 10, borderWidth: 1, borderColor: '#E2E7ED' },
  statusText: { color: COLORS.ink, fontSize: 10, fontWeight: '900', textTransform: 'capitalize' },
  empty: { color: COLORS.muted, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 30, lineHeight: 21, backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: '#E5ECE8', overflow: 'hidden' },
  helper: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginVertical: 8 },
  spinner: { paddingVertical: 40 },
  message: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: COLORS.line },
  messageError: { backgroundColor: '#FEF3F2' },
  messageSuccess: { backgroundColor: '#E7F5EC' },
  messageText: { flex: 1, color: COLORS.green, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  errorText: { color: COLORS.red },
  messageClose: { color: COLORS.muted, fontSize: 20, paddingHorizontal: 4 },
  fieldFoot: { fontSize: 11, color: COLORS.muted },
  footnote: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 16, lineHeight: 17 },
  reviewBox: { backgroundColor: '#F7FAF8', borderRadius: 15, padding: 13, marginTop: 9, borderWidth: 1, borderColor: '#E1EAE5' },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#E7E8EA', paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 18 : 8, paddingHorizontal: 5, minHeight: Platform.OS === 'android' ? 66 : 70, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 14 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, borderRadius: 13 },
  tabIcon: { color: '#8A96A3', fontSize: 21, lineHeight: 24, fontWeight: '800', marginBottom: 1 },
  tabIconActive: { color: COLORS.orange },
  tabText: { color: '#7A8794', fontSize: 10, fontWeight: '800' },
  tabTextActive: { color: COLORS.orange },
  chatLog: { backgroundColor: '#F5F8F6', borderRadius: 17, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: '#E5ECE8' },
  chatBubble: { borderRadius: 13, padding: 12, marginVertical: 4, maxWidth: '92%' },
  chatUser: { alignSelf: 'flex-end', backgroundColor: '#E4F4E9' },
  chatAssistant: { alignSelf: 'flex-start', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  chatLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '900', marginBottom: 4 },
  chatText: { color: COLORS.ink, fontSize: 14, lineHeight: 20 }
});
