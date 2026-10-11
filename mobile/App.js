import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';

const API_BASE = (Constants.expoConfig?.extra?.apiBaseUrl || 'https://fixit-salone-api.onrender.com').replace(/\/$/, '');
const COLORS = { navy: '#0C2340', green: '#16834A', pale: '#F2F7F4', ink: '#1D2939', muted: '#667085', line: '#E4E7EC', white: '#FFFFFF', red: '#B42318' };

function Button({ title, onPress, secondary = false, disabled = false }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.buttonSecondaryText]}>{title}</Text>
    </Pressable>
  );
}

function Field({ value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'sentences' }) {
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#98A2B3" secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} style={styles.input} />
  );
}

export default function App() {
  const [role, setRole] = useState('customer');
  const [mode, setMode] = useState('login');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(API_BASE + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to complete request.');
    return data;
  }

  async function authenticate() {
    setBusy(true); setError('');
    try {
      const registering = mode === 'register';
      const data = await api(registering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(registering ? { full_name: fullName.trim(), phone: phone.trim(), password, role } : { phone: phone.trim(), password })
      });
      setToken(data.token); setUser(data.user); setRole(data.user.role); setTab('home');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function loadProviders() {
    try {
      const list = await api('/api/providers' + (search.trim() ? '?service=' + encodeURIComponent(search.trim()) : ''));
      setProviders(Array.isArray(list) ? list : []);
    } catch (e) { setError(e.message); }
  }

  async function loadJobs() {
    try {
      const data = await api(user?.role === 'provider' ? '/api/provider/requests' : '/api/service-requests/mine');
      setJobs(Array.isArray(data) ? data : (data.requests || data.rows || []));
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (token && user) { if (user.role === 'customer') loadProviders(); loadJobs(); } }, [token, user]);
  useEffect(() => { if (token && user?.role === 'customer') loadProviders(); }, [search]);

  function signOut() { setToken(''); setUser(null); setJobs([]); setProviders([]); setPassword(''); setTab('home'); }

  if (!token || !user) return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <KeyboardAvoidingView style={styles.authKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.authScreen}>
        <View style={styles.brandMark}><Text style={styles.brandIcon}>⌂</Text></View>
        <Text style={styles.brand}><Text style={{ color: COLORS.navy }}>FixIt</Text><Text style={{ color: COLORS.green }}> Salone</Text></Text>
        <Text style={styles.tagline}>Trusted local services, made simpler.</Text>
        <View style={styles.authCard}>
          <Text style={styles.heading}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
          <Text style={styles.subheading}>Choose how you want to use FixIt Salone.</Text>
          <View style={styles.roleRow}>
            {['customer', 'provider'].map(item => <Pressable key={item} onPress={() => setRole(item)} style={[styles.roleChip, role === item && styles.roleChipActive]}><Text style={[styles.roleText, role === item && styles.roleTextActive]}>{item === 'customer' ? 'Customer' : 'Service provider'}</Text></Pressable>)}
          </View>
          {mode === 'register' && <Field value={fullName} onChangeText={setFullName} placeholder="Full name" />}
          <Field value={phone} onChangeText={setPhone} placeholder="Phone number (+232...)" keyboardType="phone-pad" autoCapitalize="none" />
          <Field value={password} onChangeText={setPassword} placeholder="Password (at least 8 characters)" secureTextEntry autoCapitalize="none" />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button title={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} onPress={authenticate} disabled={busy || !phone.trim() || !password || (mode === 'register' && !fullName.trim())} />
          <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={styles.switchMode}><Text style={styles.link}>{mode === 'login' ? 'New to FixIt Salone? Create an account' : 'Already registered? Sign in'}</Text></Pressable>
          <Text style={styles.footnote}>Your account uses the existing FixIt Salone service.</Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const title = user.role === 'provider' ? 'Provider workspace' : 'Find a professional';
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={styles.header}>
        <View><Text style={styles.headerBrand}><Text style={{ color: '#FFFFFF' }}>FixIt</Text><Text style={{ color: '#7DDBA4' }}> Salone</Text></Text><Text style={styles.headerSmall}>Hello, {(user.full_name || 'there').split(' ')[0]}</Text></View>
        <Pressable onPress={signOut} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text></Pressable>
      </View>
      <View style={styles.content}>
        <Text style={styles.heading}>{tab === 'jobs' ? (user.role === 'provider' ? 'Incoming requests' : 'My requests') : title}</Text>
        <Text style={styles.subheading}>{tab === 'jobs' ? 'Your latest service activity.' : user.role === 'provider' ? 'Manage requests sent to your business.' : 'Find trusted help for your home and business.'}</Text>
        {!!error && <Pressable onPress={() => setError('')}><Text style={styles.error}>{error}  ×</Text></Pressable>}
        {tab === 'home' && user.role === 'customer' && <>
          <Field value={search} onChangeText={setSearch} placeholder="Search plumbing, electrical, cleaning…" />
          <Button title="Refresh professionals" secondary onPress={loadProviders} />
          <FlatList data={providers} keyExtractor={(item, index) => String(item.id || index)} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No providers to show yet. Try refreshing.</Text>} renderItem={({ item }) => (
            <View style={styles.card}><View style={styles.cardTop}><View style={styles.avatar}><Text style={styles.avatarText}>{(item.business_name || item.full_name || 'FS').slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{item.business_name || item.full_name || 'Service provider'}</Text><Text style={styles.cardMeta}>{item.service_name || 'Local services'} · {item.region || 'Sierra Leone'}</Text></View></View><Text style={styles.cardDescription}>{item.service_description || 'Local service professional on FixIt Salone.'}</Text><Text style={styles.cardMeta}>{item.price_sle != null ? 'SLE ' + Number(item.price_sle).toLocaleString() : 'Request a quotation'}  ·  {item.rating != null ? '★ ' + item.rating : 'Not yet rated'}</Text></View>
          )} />
        </>}
        {tab === 'home' && user.role === 'provider' && <View style={styles.welcomeCard}><Text style={styles.welcomeTitle}>Your business, one place.</Text><Text style={styles.cardDescription}>Review incoming requests, respond to customers, and manage your work from the Jobs tab.</Text><Button title="View incoming requests" onPress={() => { setTab('jobs'); loadJobs(); }} /></View>}
        {tab === 'jobs' && <FlatList data={jobs} keyExtractor={(item, index) => String(item.id || index)} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.empty}>No requests found yet.</Text>} renderItem={({ item }) => <View style={styles.card}><Text style={styles.cardTitle}>{item.service_name || item.business_name || item.provider_name || 'Service request'}</Text><Text style={styles.cardDescription}>{item.job_details || item.description || 'Open request'}</Text><Text style={styles.cardMeta}>{item.status || 'Pending'} · {item.region || ''} {item.district || ''}</Text>{item.quoted_amount != null && <Text style={styles.price}>Quote: SLE {Number(item.quoted_amount).toLocaleString()}</Text>}</View>} />}
      </View>
      <View style={styles.tabBar}>
        <Pressable style={styles.tabItem} onPress={() => setTab('home')}><Text style={[styles.tabText, tab === 'home' && styles.tabTextActive]}>⌂  Home</Text></Pressable>
        <Pressable style={styles.tabItem} onPress={() => { setTab('jobs'); loadJobs(); }}><Text style={[styles.tabText, tab === 'jobs' && styles.tabTextActive]}>▤  {user.role === 'provider' ? 'Jobs' : 'My requests'}</Text></Pressable>
        <Pressable style={styles.tabItem} onPress={() => Alert.alert('Coming next', 'Profile, subscriptions, quotes, and photo uploads are the next mobile milestones.')}><Text style={styles.tabText}>◉  Account</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.pale },
  authKeyboard: { flex: 1 },
  authScreen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 28, backgroundColor: COLORS.pale },
  brandMark: { alignSelf: 'center', width: 62, height: 62, borderRadius: 20, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  brandIcon: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', marginTop: -5 },
  brand: { fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -1 },
  tagline: { textAlign: 'center', color: COLORS.muted, marginTop: 7, marginBottom: 24 },
  authCard: { backgroundColor: COLORS.white, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.line },
  heading: { fontSize: 24, fontWeight: '800', color: COLORS.ink, letterSpacing: -0.5 },
  subheading: { color: COLORS.muted, lineHeight: 21, marginTop: 5, marginBottom: 18 },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  roleChip: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, alignItems: 'center' },
  roleChipActive: { backgroundColor: '#E7F5EC', borderColor: COLORS.green },
  roleText: { color: COLORS.muted, fontWeight: '700', fontSize: 13 },
  roleTextActive: { color: COLORS.green },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: COLORS.ink, marginBottom: 12 },
  button: { backgroundColor: COLORS.green, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonSecondary: { backgroundColor: '#E7F5EC', borderWidth: 1, borderColor: '#B8E3C7' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  buttonSecondaryText: { color: COLORS.green },
  disabled: { opacity: 0.5 },
  switchMode: { alignItems: 'center', marginTop: 18 },
  link: { color: COLORS.green, fontWeight: '700', textAlign: 'center' },
  footnote: { textAlign: 'center', color: COLORS.muted, fontSize: 11, marginTop: 18 },
  error: { color: COLORS.red, marginBottom: 10, lineHeight: 20 },
  header: { backgroundColor: COLORS.navy, paddingHorizontal: 20, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBrand: { fontSize: 21, fontWeight: '900' },
  headerSmall: { color: '#D0D5DD', marginTop: 3 },
  signOut: { borderWidth: 1, borderColor: '#667085', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  signOutText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 20 },
  list: { paddingBottom: 18 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.line },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E7F5EC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.green, fontSize: 19, fontWeight: '900' },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  cardMeta: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  cardDescription: { color: COLORS.ink, fontSize: 14, lineHeight: 20, marginTop: 12 },
  price: { color: COLORS.green, fontSize: 15, fontWeight: '800', marginTop: 10 },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: 28, lineHeight: 21 },
  welcomeCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, padding: 18, marginTop: 8 },
  welcomeTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.line, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 18 : 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 7 },
  tabText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: COLORS.green },
});
