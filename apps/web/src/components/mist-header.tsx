import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import React from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
	{ name: "Features", href: "/#features" },
	{ name: "Pricing", href: "/#pricing" },
	{ name: "About", href: "/#about" },
];

export const MistHeader = () => {
	const [menuState, setMenuState] = React.useState(false);
	const [isScrolled, setIsScrolled] = React.useState(false);

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header>
			<nav
				data-state={menuState ? "active" : undefined}
				className={cn(
					"group fixed z-20 w-full transition-all duration-300",
					isScrolled &&
						"bg-background/75 border-b border-black/5 backdrop-blur-lg",
				)}
			>
				<div className="mx-auto max-w-5xl px-6">
					<div
						className={cn(
							"relative flex flex-wrap items-center justify-between gap-6 py-6 transition-all duration-200 lg:gap-0",
							isScrolled && "py-3",
						)}
					>
						<div className="flex w-full justify-between gap-6 lg:w-auto">
							<Link
								to="/"
								aria-label="home"
								className="flex items-center space-x-2"
							>
								<Logo />
							</Link>

							<button
								onClick={() => setMenuState(!menuState)}
								aria-label={menuState ? "Close Menu" : "Open Menu"}
								className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
							>
								<Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
								<X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
							</button>

							<div className="m-auto hidden size-fit lg:block">
								<ul className="flex gap-1">
									{menuItems.map((item, index) => (
										<li key={index}>
											<Button asChild variant="ghost" size="sm">
												<Link
													to={item.href}
													className="text-foreground text-base"
												>
													<span>{item.name}</span>
												</Link>
											</Button>
										</li>
									))}
								</ul>
							</div>
						</div>

						<div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-foreground/10 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:lg:bg-transparent">
							<div className="lg:hidden">
								<ul className="space-y-6 text-base">
									{menuItems.map((item, index) => (
										<li key={index}>
											<Link
												to={item.href}
												className="text-muted-foreground hover:text-accent-foreground block duration-150"
											>
												<span>{item.name}</span>
											</Link>
										</li>
									))}
								</ul>
							</div>
							<div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
								<Button
									asChild
									variant="ghost"
									size="sm"
									className={cn(isScrolled && "lg:hidden")}
								>
									<Link to="/login" className="text-foreground">
										<span>Login</span>
									</Link>
								</Button>
								<Button
									asChild
									size="sm"
									className={cn(isScrolled && "lg:hidden")}
								>
									<Link to="/signup" className="text-primary-foreground">
										<span>Sign Up</span>
									</Link>
								</Button>
								<Button
									asChild
									size="sm"
									className={cn(isScrolled ? "lg:inline-flex" : "hidden")}
								>
									<Link to="/signup" className="text-primary-foreground">
										<span>Get Started</span>
									</Link>
								</Button>
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
};
