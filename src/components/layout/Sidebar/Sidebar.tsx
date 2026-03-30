import { Menu } from "lucide-react";
import { SidebarDesktop } from "../Sidebar-components/sidebar-desktop";
import { useState } from "react";
import { SidebarMobile } from "../Sidebar-components/sidebar-mobile";
import { Button } from "@/components/ui/button";
import { getRouterLinksByUserType } from "@/constatnts/app.constant";
import { useAppSelector } from "@/redux/hooks/hooks";

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { userType } = useAppSelector((state) => state.auth);

    // Filter links based on user type
    const links = getRouterLinksByUserType(userType);

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="md:hidden flex justify-between p-4 bg-surface-container-lowest border-b border-outline-variant/20">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label="Open navigation menu"
                    aria-expanded={isMobileOpen}
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </div>
            <SidebarMobile links={links} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
            <SidebarDesktop links={links} isOpen={isOpen} setIsOpen={setIsOpen} />
        </>
    );
}
