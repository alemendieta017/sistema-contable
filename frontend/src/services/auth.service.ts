import { api } from './api';

export const authService = {
  register: api.auth.register,
  login: api.auth.login,
  me: api.auth.me,
  changePassword: api.auth.changePassword,
  forgotPassword: api.auth.forgotPassword,
  resetPassword: api.auth.resetPassword,
  logout: api.auth.logout,
  getUser: api.auth.getUser,
};
