import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
} from "@/components/icons/social-icons";
import { footerNav } from "@/config/navigation";

const socialLinks = [
  { label: "Facebook", icon: FacebookIcon },
  { label: "Twitter", icon: TwitterIcon },
  { label: "Instagram", icon: InstagramIcon },
];

export function SiteFooter() {
  return (
    <footer className="bg-footer px-[70px] pt-10 pb-5 text-white max-nav:px-5">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 flex items-center justify-between max-nav:flex-col max-nav:text-center">
          <p className="text-[40px] font-bold">MEDEASE</p>
          <div className="ml-[50px] flex flex-1 justify-end max-nav:mt-5 max-nav:ml-0 max-nav:justify-center">
            {footerNav.map((section) => (
              <div
                key={section.title}
                className="mr-[30px] max-nav:mr-0 max-nav:mb-5"
              >
                <h3 className="mb-2.5 font-bold uppercase">{section.title}</h3>
                <ul>
                  {section.links.map((link) => (
                    <li key={link} className="my-[5px]">
                      <a href="#" className="text-footer-link hover:text-brand">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-footer-line pt-2.5 max-nav:flex-col max-nav:text-center">
          <p className="text-sm text-ink-muted">
            &copy; 2024 All Rights Reserved Medease
          </p>
          <div className="flex">
            {socialLinks.map(({ label, icon: Icon }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="mx-2.5 text-footer-link hover:text-brand"
              >
                <Icon className="size-8" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
