'use client';
import { Eye, EyeOff } from 'lucide-react';
const PasswordField = ({ value, onChange, showPassword, toggleShowPassword }) => (
    <div>
      <label htmlFor="password" className="block text-sm font-medium text-gray-900">
        Password
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id="password"
          name="password"
          value={value}
          onChange={onChange}
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          placeholder="Enter your password"
        />
        <div
          className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
          onClick={toggleShowPassword}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5 text-gray-400" />
          ) : (
            <Eye className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
  export default PasswordField;