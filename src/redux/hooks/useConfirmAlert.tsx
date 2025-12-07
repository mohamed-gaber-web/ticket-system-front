// useConfirmAlert.ts

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// Create a configured SweetAlert instance for React
const MySwal = withReactContent(Swal);

// Define the interface for the parameters you want to customize
interface ConfirmOptions {
    title?: string;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

/**
 * Displays a beautiful, reusable confirmation alert using SweetAlert2.
 * * @param options - Customization options for the alert.
 * @returns A promise that resolves to true if confirmed, false otherwise.
 */
export const showDeleteConfirmation = async (
    options: ConfirmOptions
): Promise<boolean> => {
    // Default values for common settings, ensuring a consistent look
    const defaultOptions: ConfirmOptions = {
        title: 'Are you sure?',
        text: 'You want to remove category !',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'No, keep it',
    };

    const config: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        ...defaultOptions, // Start with defaults
        ...options,       // Override with custom options
        
        // Fixed settings for a deletion confirmation
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', // Danger Red
        cancelButtonColor: '#3085d6',
    };

    const result: any = await MySwal.fire(config); // eslint-disable-line @typescript-eslint/no-explicit-any

    // SweetAlert2 returns result.isConfirmed when the 'Confirm' button is clicked
    return result.isConfirmed;
};