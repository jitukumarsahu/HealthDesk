import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Doctor' | 'Patient';
  doctorProfile?: {
    specialization: string;
    biography?: string;
    experienceYears?: number;
  };
}

interface AuthState {
  user: UserState | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: UserState; accessToken: string }>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isAuthenticated = true;
    },
    updateUser: (state, action: PayloadAction<UserState>) => {
      state.user = action.payload;
    }
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  setAccessToken,
  updateUser,
} = authSlice.actions;

export default authSlice.reducer;
