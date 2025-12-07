import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { getProfile, updateProfile } from '@/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const ProfilePage = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });
  
  console.log('ProfilePage mounted, fetching profile data', user);
  useEffect(() => {
    // Load profile on mount
    dispatch(getProfile());

  }, [dispatch]);

  useEffect(() => {
    // Update form data when user data is loaded
    if (user) {
      setFormData({
        companyName: user.companyName || '',
        contactPerson: user.contactPerson || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await dispatch(updateProfile(formData)).unwrap();
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (user) {
      setFormData({
        companyName: user.companyName || '',
        contactPerson: user.contactPerson || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
      });
    }
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">My Profile</CardTitle>
              <CardDescription>View and manage your account information</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user.email} disabled className="bg-gray-50" />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>

                {/* <div className="space-y-2">
                please fix it with the AI
                  <label className="text-sm font-medium">User Type</label>
                  <Input
                    value={user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                    disabled
                    className="bg-gray-50"
                  />
                </div> */}
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium">
                    Company Name
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contactPerson" className="text-sm font-medium">
                    Contact Person
                  </label>
                  <Input
                    id="contactPerson"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium">
                    Address
                  </label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-gray-50' : ''}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium">
                      City
                    </label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-gray-50' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium">
                      Country
                    </label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-gray-50' : ''}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Input
                    value={user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Login</label>
                  <Input
                    value={
                      user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString()
                        : 'Never'
                    }
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-2 justify-end">
                <Button type="button" onClick={handleCancel} variant="outline">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
